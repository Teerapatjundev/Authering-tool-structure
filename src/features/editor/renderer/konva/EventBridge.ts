/**
 * ===============================================
 * EVENT BRIDGE - จัดการ Mouse Events
 * ===============================================
 *
 * จัดการ events ทั้งหมดบน canvas:
 *
 * 1. WHEEL - zoom เข้า/ออก
 * 2. MOUSE DOWN:
 *    - คลิกที่ node → เลือก node
 *    - คลิกที่ว่าง → เริ่ม marquee selection
 *    - Middle click → เริ่ม pan
 * 3. MOUSE MOVE:
 *    - ลาก nodes ที่เลือก (พร้อม snap + canvas bounds)
 *    - Marquee selection (ลากคลุมเลือก + แสดง rectangle)
 *    - Pan canvas
 * 4. MOUSE UP - จบการ drag/selection
 */

"use client";

import { useEffect, useRef } from "react";
import Konva from "konva";
import { useViewStore } from "../../stores/viewStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useToolStore } from "../../stores/toolStore";
import { useDocStore } from "../../stores/docStore";
import { useSnapGuidesStore } from "../../stores/snapGuidesStore";
import { useMarqueeStore } from "../../stores/marqueeStore";
import { useVideoPlayStore } from "../../stores/videoPlayStore";
import { useContextMenuStore } from "../../stores/contextMenuStore";
import { findTopNodeAt } from "../../core/geometry/hitTest";
import {
  boundsIntersect,
  boundsContainsPoint,
  getMultiSelectionBounds,
} from "../../core/geometry/bounds";
import { snapNodes } from "../../core/geometry/snap";
import {
  commitMoveWithOriginal,
} from "../../core/commands/transform";
import { useHistoryStore } from "../../core/history/historyStore";
import { InsertOp } from "../../core/history/ops";
import { generateNodeId } from "@/shared/utils/id";

interface EventBridgeProps {
  stageRef: React.RefObject<Konva.Stage>;
  width: number;
  height: number;
}

/**
 * ขยาย selection ให้รวม nodes ทั้ง group
 * ถ้าคลิกที่ node ที่มี groupId → เลือกทุก node ที่มี groupId เดียวกัน
 */
function expandGroupIds(hitNodeId: string, allNodes: { id: string; groupId?: string }[]): string[] {
  const hitNode = allNodes.find((n) => n.id === hitNodeId);
  if (!hitNode || !hitNode.groupId) return [hitNodeId];

  // หาทุก node ที่อยู่ใน group เดียวกัน
  return allNodes
    .filter((n) => n.groupId === hitNode.groupId)
    .map((n) => n.id);
}

/**
 * ขยาย set ของ IDs ให้รวม group members ทั้งหมด
 */
function expandAllGroupIds(ids: string[], allNodes: { id: string; groupId?: string }[]): string[] {
  const result = new Set(ids);
  for (const id of ids) {
    const node = allNodes.find((n) => n.id === id);
    if (node?.groupId) {
      for (const n of allNodes) {
        if (n.groupId === node.groupId) result.add(n.id);
      }
    }
  }
  return Array.from(result);
}

export function EventBridge({ stageRef }: EventBridgeProps) {
  // Refs สำหรับเก็บ state ระหว่าง drag
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const isMarqueeRef = useRef(false);
  // เก็บตำแหน่งเดิมของ nodes ก่อนลาก (สำหรับ undo/redo)
  const originalPositionsRef = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  // สะสม delta ของเมาส์ตั้งแต่เริ่มลาก (raw, ไม่ถูก snap)
  const accDeltaRef = useRef({ x: 0, y: 0 });
  // Alt+drag duplicate: เก็บว่าเป็นการลาก duplicate หรือไม่
  const isAltDuplicatingRef = useRef(false);
  // Long-press timer สำหรับ context menu บน touch devices
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // ===============================================
    // WHEEL - Zoom เข้า/ออก
    // ===============================================
    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const { setZoom, viewport } = useViewStore.getState();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Zoom factor
      const scaleBy = 1.05;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newZoom =
        direction > 0 ? viewport.zoom * scaleBy : viewport.zoom / scaleBy;

      // Zoom ไปที่ตำแหน่ง pointer
      setZoom(newZoom, pointer.x, pointer.y);
    };

    // ===============================================
    // MOUSE DOWN
    // ===============================================
    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
      const { activeTool } = useToolStore.getState();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const { screenToWorld } = useViewStore.getState();
      const worldPos = screenToWorld(pointer.x, pointer.y);

      // ตรวจสอบว่าคลิกที่ Transformer handles หรือไม่
      // ถ้าใช่ ให้ Transformer จัดการเอง ไม่ต้องทำอะไร
      const target = e.target;
      const targetName = target?.name?.() || "";
      const targetClassName = target?.className;
      const parentClassName = target?.getParent()?.className;
      const grandParentClassName = target?.getParent()?.getParent()?.className;

      // Konva Transformer anchor names และ className
      const transformerAnchorNames = [
        "top-left",
        "top-center",
        "top-right",
        "middle-left",
        "middle-right",
        "bottom-left",
        "bottom-center",
        "bottom-right",
        "rotater",
        "_anchor", // Konva internal anchor
        "back", // Transformer back element
      ];

      const isTransformerHandle =
        transformerAnchorNames.some((name) => targetName.includes(name)) ||
        targetClassName === "Transformer" ||
        parentClassName === "Transformer" ||
        grandParentClassName === "Transformer" ||
        target?.getParent()?.name?.()?.includes("_anchor");

      if (isTransformerHandle) {
        // ให้ Transformer จัดการ rotation/resize
        return;
      }

      // Right-click → เปิด context menu
      if (e.evt.button === 2) {
        e.evt.preventDefault();
        const { doc } = useDocStore.getState();
        if (!doc) return;

        const hitNode = findTopNodeAt(doc.nodes, worldPos.x, worldPos.y);
        if (hitNode) {
          // ถ้าคลิกขวาที่ node ที่ยังไม่ได้เลือก → เลือกก่อน (รวม group)
          const { selectedIds, selectMultiple } = useSelectionStore.getState();
          if (!selectedIds.has(hitNode.id)) {
            const groupIds = expandGroupIds(hitNode.id, doc.nodes);
            selectMultiple(groupIds);
          }
        }

        useContextMenuStore.getState().open(
          e.evt.clientX,
          e.evt.clientY,
          hitNode?.id ?? null,
        );
        return;
      }

      // ปิด context menu เมื่อคลิกซ้าย
      useContextMenuStore.getState().close();

      // Middle mouse button = pan
      if (e.evt.button === 1) {
        useViewStore.getState().setIsPanning(true);
        dragStartRef.current = { x: pointer.x, y: pointer.y };
        return;
      }

      // Pan tool behavior
      if (activeTool === "pan") {
        useViewStore.getState().setIsPanning(true);
        dragStartRef.current = { x: pointer.x, y: pointer.y };
        return;
      }

      // Select tool behavior
      if (activeTool === "select") {
        const { doc } = useDocStore.getState();
        if (!doc) return;

        const { viewport } = useViewStore.getState();
        const { selectedIds, select, toggleSelect, getSelectedIds } =
          useSelectionStore.getState();

        // ตรวจสอบว่าคลิกอยู่ในพื้นที่ของ nodes ที่เลือกอยู่หรือไม่
        const currentSelectedIds = getSelectedIds();
        const selectedNodes = doc.nodes.filter((n) =>
          currentSelectedIds.includes(n.id),
        );

        // ถ้ามี selection อยู่แล้ว ตรวจสอบว่าคลิกอยู่ในพื้นที่ selection หรือไม่
        if (selectedNodes.length > 0) {
          const selectionBounds = getMultiSelectionBounds(selectedNodes);
          if (selectionBounds) {
            // Add padding for transformer handles (approximately 20px at zoom 1)
            const handlePadding = 30 / viewport.zoom;
            const expandedBounds = {
              x: selectionBounds.x - handlePadding,
              y: selectionBounds.y - handlePadding,
              width: selectionBounds.width + handlePadding * 2,
              height: selectionBounds.height + handlePadding * 2,
            };

            if (boundsContainsPoint(expandedBounds, worldPos.x, worldPos.y)) {
              // =============================================
              // ALT + DRAG = Duplicate แบบ Canva
              // กด Alt ค้าง + คลิกลากที่ selected nodes → สร้าง clone แล้วลาก clone ออก
              // =============================================
              if (e.evt.altKey) {
                const clonedNodes = selectedNodes.map((n) => ({
                  ...JSON.parse(JSON.stringify(n)),
                  id: generateNodeId(),
                }));

                // Insert cloned nodes ผ่าน history (undo ได้)
                const insertOp: InsertOp = {
                  type: "insert",
                  timestamp: Date.now(),
                  nodes: clonedNodes,
                };
                useHistoryStore.getState().commit(insertOp);

                // เลือก cloned nodes แทน originals
                useSelectionStore.getState().selectMultiple(clonedNodes.map((n) => n.id));

                // เริ่มลาก cloned nodes
                isDraggingRef.current = true;
                isAltDuplicatingRef.current = true;
                dragStartRef.current = worldPos;
                accDeltaRef.current = { x: 0, y: 0 };
                originalPositionsRef.current.clear();
                clonedNodes.forEach((n) => {
                  originalPositionsRef.current.set(n.id, { x: n.x, y: n.y });
                });
                useVideoPlayStore.getState().stopVideo();
                return;
              }

              // คลิกอยู่ในพื้นที่ selection (รวม handles) → เริ่มลากได้เลย ไม่ต้อง clear selection
              isDraggingRef.current = true;
              dragStartRef.current = worldPos;
              accDeltaRef.current = { x: 0, y: 0 };
              // บันทึกตำแหน่งเดิมของ selected nodes + group members สำหรับ undo
              originalPositionsRef.current.clear();
              const allTrackIds = expandAllGroupIds(currentSelectedIds, doc.nodes);
              // อัพเดท selection ให้รวม group members ด้วย
              if (allTrackIds.length > currentSelectedIds.length) {
                useSelectionStore.getState().selectMultiple(allTrackIds);
              }
              doc.nodes.filter((n) => allTrackIds.includes(n.id)).forEach((n) => {
                originalPositionsRef.current.set(n.id, { x: n.x, y: n.y });
              });
              // หยุดเล่น video ถ้ากำลังลากขยับ
              useVideoPlayStore.getState().stopVideo();
              return;
            }
          }
        }

        // หา node ที่คลิกโดน
        const hitNode = findTopNodeAt(doc.nodes, worldPos.x, worldPos.y);

        if (hitNode) {
          // หยุดเล่น video ถ้าคลิกที่ node อื่นที่ไม่ใช่ video ที่กำลังเล่น
          const { playingNodeId, stopVideo } = useVideoPlayStore.getState();
          if (hitNode.type !== "video" || hitNode.id !== playingNodeId) {
            stopVideo();
          }

          // ขยาย selection ให้รวมทั้ง group
          const groupIds = expandGroupIds(hitNode.id, doc.nodes);

          // คลิกที่ node
          if (e.evt.shiftKey) {
            // Shift+click = toggle group selection
            const { selectMultiple, getSelectedIds } = useSelectionStore.getState();
            const currentIds = new Set(getSelectedIds());
            const allInGroup = groupIds.every((id) => currentIds.has(id));
            if (allInGroup) {
              // ถ้ากลุ่มทั้งหมดเลือกอยู่แล้ว → ถอดออก
              groupIds.forEach((id) => currentIds.delete(id));
            } else {
              // เพิ่มกลุ่มเข้าไป
              groupIds.forEach((id) => currentIds.add(id));
            }
            selectMultiple(Array.from(currentIds));
          } else {
            // ถ้ายังไม่ได้เลือก node นี้ → เลือก (รวม group)
            if (!selectedIds.has(hitNode.id)) {
              useSelectionStore.getState().selectMultiple(groupIds);
            }
          }

          // เริ่มลาก
          isDraggingRef.current = true;
          dragStartRef.current = worldPos;
          accDeltaRef.current = { x: 0, y: 0 };
          // บันทึกตำแหน่งเดิมของ selected nodes สำหรับ undo
          originalPositionsRef.current.clear();
          // รวม hitNode + group + nodes ที่เลือกแล้ว
          const currentSelectedIds = useSelectionStore.getState().getSelectedIds();
          const allTrackIds = expandAllGroupIds(currentSelectedIds, doc.nodes);
          const nodesToTrack = doc.nodes.filter((n) => allTrackIds.includes(n.id));
          nodesToTrack.forEach((n) => {
            originalPositionsRef.current.set(n.id, { x: n.x, y: n.y });
          });
        } else {
          // คลิกที่ว่าง → marquee selection
          if (!e.evt.shiftKey) {
            useSelectionStore.getState().clearSelection();
          }
          // หยุดเล่น video เพื่อให้ลากคลุมได้
          useVideoPlayStore.getState().stopVideo();
          isMarqueeRef.current = true;
          marqueeStartRef.current = worldPos;
        }
      }
    };

    // ===============================================
    // MOUSE MOVE
    // ===============================================
    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // 1. Panning
      if (useViewStore.getState().isPanning && dragStartRef.current) {
        const dx = pointer.x - dragStartRef.current.x;
        const dy = pointer.y - dragStartRef.current.y;
        useViewStore.getState().pan(dx, dy);
        dragStartRef.current = { x: pointer.x, y: pointer.y };
        return;
      }

      const { screenToWorld } = useViewStore.getState();
      const worldPos = screenToWorld(pointer.x, pointer.y);

      // 2. Dragging selected nodes (accumulated delta approach)
      if (isDraggingRef.current && dragStartRef.current) {
        // สะสม raw delta จากจุดเริ่มลาก (ไม่ถูก snap)
        const frameDx = worldPos.x - dragStartRef.current.x;
        const frameDy = worldPos.y - dragStartRef.current.y;
        accDeltaRef.current.x += frameDx;
        accDeltaRef.current.y += frameDy;
        dragStartRef.current = worldPos;

        let dx = accDeltaRef.current.x;
        let dy = accDeltaRef.current.y;

        const { getSelectedIds } = useSelectionStore.getState();
        const selectedIds = getSelectedIds();

        if (selectedIds.length > 0) {
          const { doc, updateNodes } = useDocStore.getState();
          if (!doc) return;

          // สร้าง "virtual nodes" ที่ตำแหน่ง original + accumulated delta
          // เพื่อใช้คำนวณ snap จากตำแหน่งเดิม
          const virtualNodes = selectedIds
            .map((id: string) => {
              const orig = originalPositionsRef.current.get(id);
              const node = doc.nodes.find((n) => n.id === id);
              if (!orig || !node) return null;
              return { ...node, x: orig.x + dx, y: orig.y + dy };
            })
            .filter(Boolean) as typeof doc.nodes;

          if (virtualNodes.length === 0) return;

          // คำนวณ bounding box ของ virtual nodes เพื่อ clamp ขอบ canvas
          const groupBounds = getMultiSelectionBounds(virtualNodes);
          if (!groupBounds) return;

          // Clamp dx/dy ให้ bounding box ของกลุ่มไม่ล้นขอบ canvas
          if (groupBounds.x < 0) dx -= groupBounds.x;
          if (groupBounds.x + groupBounds.width > doc.width)
            dx -= groupBounds.x + groupBounds.width - doc.width;
          if (groupBounds.y < 0) dy -= groupBounds.y;
          if (groupBounds.y + groupBounds.height > doc.height)
            dy -= groupBounds.y + groupBounds.height - doc.height;

          // อัพเดท virtual nodes หลัง clamp
          const clampedVirtualNodes = selectedIds
            .map((id: string) => {
              const orig = originalPositionsRef.current.get(id);
              const node = doc.nodes.find((n) => n.id === id);
              if (!orig || !node) return null;
              return { ...node, x: orig.x + dx, y: orig.y + dy };
            })
            .filter(Boolean) as typeof doc.nodes;

          // ===== SMART SNAP =====
          // snap คำนวณจาก virtual nodes (original + delta)
          // ส่ง dx=0,dy=0 เพราะ virtual nodes อยู่ที่ตำแหน่งที่ต้องการแล้ว
          const snapResult = snapNodes(
            clampedVirtualNodes,
            doc.nodes,
            0,
            0,
            doc.width,
            doc.height,
          );

          // ปรับ delta ด้วย snap offset
          const finalDx = dx + snapResult.dx;
          const finalDy = dy + snapResult.dy;

          // แสดง snap guides
          useSnapGuidesStore.getState().setGuides(snapResult.guides);
          useSnapGuidesStore.getState().setSpacingGuides(snapResult.spacingGuides);

          // อัพเดทตำแหน่ง nodes = original + finalDelta
          const updates = selectedIds.map((id: string) => {
            const orig = originalPositionsRef.current.get(id);
            if (!orig) return { id, changes: {} };
            return {
              id,
              changes: {
                x: orig.x + finalDx,
                y: orig.y + finalDy,
              },
            };
          });

          updateNodes(updates);
        }
      }

      // 3. Marquee selection - แสดง rectangle
      if (isMarqueeRef.current && marqueeStartRef.current) {
        const marqueeBounds = {
          x: Math.min(marqueeStartRef.current.x, worldPos.x),
          y: Math.min(marqueeStartRef.current.y, worldPos.y),
          width: Math.abs(worldPos.x - marqueeStartRef.current.x),
          height: Math.abs(worldPos.y - marqueeStartRef.current.y),
        };

        // Update marquee visual
        useMarqueeStore.getState().setBounds(marqueeBounds);

        const { doc } = useDocStore.getState();
        if (doc) {
          // หา nodes ที่อยู่ใน marquee bounds
          const intersecting = doc.nodes.filter((node) => {
            const nodeBounds = {
              x: node.x - node.width / 2,
              y: node.y - node.height / 2,
              width: node.width,
              height: node.height,
            };
            return boundsIntersect(nodeBounds, marqueeBounds);
          });

          useSelectionStore
            .getState()
            .selectMultiple(expandAllGroupIds(intersecting.map((n) => n.id), doc.nodes));
        }
      }
    };

    // ===============================================
    // MOUSE UP - จบการ drag
    // ===============================================
    const handleMouseUp = () => {
      const wasDragging = isDraggingRef.current;

      // จบ pan
      if (useViewStore.getState().isPanning) {
        useViewStore.getState().setIsPanning(false);
      }

      // บันทึกการย้าย (สำหรับ undo/redo)
      if (wasDragging) {
        const { getSelectedIds } = useSelectionStore.getState();
        const selectedIds = getSelectedIds();

        if (selectedIds.length > 0 && originalPositionsRef.current.size > 0) {
          const { doc } = useDocStore.getState();
          if (doc) {
            // สร้าง map ของตำแหน่งใหม่
            const newPositions = new Map<string, { x: number; y: number }>();
            selectedIds.forEach((id: string) => {
              const node = doc.nodes.find((n) => n.id === id);
              if (node) {
                newPositions.set(id, { x: node.x, y: node.y });
              }
            });
            // บันทึก history พร้อมตำแหน่งเดิมและใหม่
            commitMoveWithOriginal(originalPositionsRef.current, newPositions);
          }
        }
      }

      // Reset states
      isDraggingRef.current = false;
      isAltDuplicatingRef.current = false;
      isMarqueeRef.current = false;
      dragStartRef.current = null;
      marqueeStartRef.current = null;
      originalPositionsRef.current.clear();
      accDeltaRef.current = { x: 0, y: 0 };
      useSnapGuidesStore.getState().clearGuides();
      useMarqueeStore.getState().clear(); // Clear marquee visual
    };

    // ===============================================
    // TOUCH HANDLERS - สำหรับ Mobile/iPad
    // ===============================================
    const handleTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
      // ป้องกัน default behaviors เช่น scroll
      e.evt.preventDefault();

      const touch = e.evt.touches[0];
      if (!touch) return;

      const { activeTool } = useToolStore.getState();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const { screenToWorld, viewport } = useViewStore.getState();
      const worldPos = screenToWorld(pointer.x, pointer.y);

      // ปิด context menu เมื่อ touch ใหม่
      useContextMenuStore.getState().close();

      // ===== LONG-PRESS → Context Menu (สำหรับ iPad/Tablet/Mobile) =====
      longPressTriggeredRef.current = false;
      const touchClientX = touch.clientX;
      const touchClientY = touch.clientY;

      // เริ่ม long-press timer (500ms)
      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        isDraggingRef.current = false; // ยกเลิก drag

        const { doc: docNow } = useDocStore.getState();
        if (!docNow) return;

        const hitNode = findTopNodeAt(docNow.nodes, worldPos.x, worldPos.y);
        if (hitNode) {
          const { selectedIds, selectMultiple } = useSelectionStore.getState();
          if (!selectedIds.has(hitNode.id)) {
            const groupIds = expandGroupIds(hitNode.id, docNow.nodes);
            selectMultiple(groupIds);
          }
        }

        useContextMenuStore.getState().open(
          touchClientX,
          touchClientY,
          hitNode?.id ?? null,
        );
      }, 500);

      // Two-finger touch = pan
      if (e.evt.touches.length >= 2) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        useViewStore.getState().setIsPanning(true);
        dragStartRef.current = { x: pointer.x, y: pointer.y };
        return;
      }

      // Pan tool behavior
      if (activeTool === "pan") {
        useViewStore.getState().setIsPanning(true);
        dragStartRef.current = { x: pointer.x, y: pointer.y };
        return;
      }

      // Select tool behavior (same as mouse)
      if (activeTool === "select") {
        const { doc } = useDocStore.getState();
        if (!doc) return;

        const { selectedIds, select, getSelectedIds } =
          useSelectionStore.getState();

        const currentSelectedIds = getSelectedIds();
        const selectedNodes = doc.nodes.filter((n) =>
          currentSelectedIds.includes(n.id),
        );

        if (selectedNodes.length > 0) {
          const selectionBounds = getMultiSelectionBounds(selectedNodes);
          if (selectionBounds) {
            const handlePadding = 40 / viewport.zoom; // Larger padding for touch
            const expandedBounds = {
              x: selectionBounds.x - handlePadding,
              y: selectionBounds.y - handlePadding,
              width: selectionBounds.width + handlePadding * 2,
              height: selectionBounds.height + handlePadding * 2,
            };

            if (boundsContainsPoint(expandedBounds, worldPos.x, worldPos.y)) {
              isDraggingRef.current = true;
              dragStartRef.current = worldPos;
              accDeltaRef.current = { x: 0, y: 0 };
              originalPositionsRef.current.clear();
              const allTrackIds = expandAllGroupIds(currentSelectedIds, doc.nodes);
              if (allTrackIds.length > currentSelectedIds.length) {
                useSelectionStore.getState().selectMultiple(allTrackIds);
              }
              doc.nodes.filter((n) => allTrackIds.includes(n.id)).forEach((n) => {
                originalPositionsRef.current.set(n.id, { x: n.x, y: n.y });
              });
              return;
            }
          }
        }

        const hitNode = findTopNodeAt(doc.nodes, worldPos.x, worldPos.y);

        if (hitNode) {
          // ขยายให้รวมทั้ง group
          const groupIds = expandGroupIds(hitNode.id, doc.nodes);
          if (!selectedIds.has(hitNode.id)) {
            useSelectionStore.getState().selectMultiple(groupIds);
          }
          isDraggingRef.current = true;
          dragStartRef.current = worldPos;
          accDeltaRef.current = { x: 0, y: 0 };
          originalPositionsRef.current.clear();
          const currentSelectedIds = useSelectionStore.getState().getSelectedIds();
          const allTrackIds = expandAllGroupIds(currentSelectedIds, doc.nodes);
          const nodesToTrack = doc.nodes.filter((n) => allTrackIds.includes(n.id));
          nodesToTrack.forEach((n) => {
            originalPositionsRef.current.set(n.id, { x: n.x, y: n.y });
          });
        } else {
          useSelectionStore.getState().clearSelection();
        }
      }
    };

    const handleTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
      e.evt.preventDefault();

      // ยกเลิก long-press ถ้ามีการเลื่อนนิ้ว
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // ถ้า long-press แล้ว → ไม่ทำอะไร (context menu จะแสดงอยู่)
      if (longPressTriggeredRef.current) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Two-finger pan
      if (
        e.evt.touches.length >= 2 &&
        useViewStore.getState().isPanning &&
        dragStartRef.current
      ) {
        const dx = pointer.x - dragStartRef.current.x;
        const dy = pointer.y - dragStartRef.current.y;
        useViewStore.getState().pan(dx, dy);
        dragStartRef.current = { x: pointer.x, y: pointer.y };
        return;
      }

      // Single touch - same as mouse move
      if (useViewStore.getState().isPanning && dragStartRef.current) {
        const dx = pointer.x - dragStartRef.current.x;
        const dy = pointer.y - dragStartRef.current.y;
        useViewStore.getState().pan(dx, dy);
        dragStartRef.current = { x: pointer.x, y: pointer.y };
        return;
      }

      const { screenToWorld } = useViewStore.getState();
      const worldPos = screenToWorld(pointer.x, pointer.y);

      if (isDraggingRef.current && dragStartRef.current) {
        // สะสม raw delta (เหมือน mouse)
        const frameDx = worldPos.x - dragStartRef.current.x;
        const frameDy = worldPos.y - dragStartRef.current.y;
        accDeltaRef.current.x += frameDx;
        accDeltaRef.current.y += frameDy;
        dragStartRef.current = worldPos;

        let dx = accDeltaRef.current.x;
        let dy = accDeltaRef.current.y;

        const { getSelectedIds } = useSelectionStore.getState();
        const selectedIds = getSelectedIds();

        if (selectedIds.length > 0) {
          const { doc, updateNodes } = useDocStore.getState();
          if (!doc) return;

          // สร้าง virtual nodes ที่ original + accumulated delta
          const virtualNodes = selectedIds
            .map((id: string) => {
              const orig = originalPositionsRef.current.get(id);
              const node = doc.nodes.find((n) => n.id === id);
              if (!orig || !node) return null;
              return { ...node, x: orig.x + dx, y: orig.y + dy };
            })
            .filter(Boolean) as typeof doc.nodes;

          if (virtualNodes.length === 0) return;

          // Clamp ขอบ canvas
          const groupBounds = getMultiSelectionBounds(virtualNodes);
          if (!groupBounds) return;

          if (groupBounds.x < 0) dx -= groupBounds.x;
          if (groupBounds.x + groupBounds.width > doc.width)
            dx -= groupBounds.x + groupBounds.width - doc.width;
          if (groupBounds.y < 0) dy -= groupBounds.y;
          if (groupBounds.y + groupBounds.height > doc.height)
            dy -= groupBounds.y + groupBounds.height - doc.height;

          // Snap
          const clampedVirtualNodes = selectedIds
            .map((id: string) => {
              const orig = originalPositionsRef.current.get(id);
              const node = doc.nodes.find((n) => n.id === id);
              if (!orig || !node) return null;
              return { ...node, x: orig.x + dx, y: orig.y + dy };
            })
            .filter(Boolean) as typeof doc.nodes;

          const snapResult = snapNodes(
            clampedVirtualNodes,
            doc.nodes,
            0,
            0,
            doc.width,
            doc.height,
          );

          const finalDx = dx + snapResult.dx;
          const finalDy = dy + snapResult.dy;

          useSnapGuidesStore.getState().setGuides(snapResult.guides);

          // ตำแหน่ง = original + finalDelta
          const updates = selectedIds.map((id: string) => {
            const orig = originalPositionsRef.current.get(id);
            if (!orig) return { id, changes: {} };
            return {
              id,
              changes: {
                x: orig.x + finalDx,
                y: orig.y + finalDy,
              },
            };
          });

          updateNodes(updates);
        }
      }
    };

    const handleTouchEnd = () => {
      // ยกเลิก long-press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // ถ้า long-press ถูก trigger แล้ว → ไม่ต้อง mouse up
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        return;
      }

      handleMouseUp(); // ใช้ logic เดียวกับ mouse up
    };

    // ===============================================
    // PINCH TO ZOOM - สำหรับ Mobile
    // ===============================================
    let lastPinchDist = 0;

    const handlePinch = (e: Konva.KonvaEventObject<TouchEvent>) => {
      if (e.evt.touches.length !== 2) return;

      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      const dist = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY,
      );

      if (lastPinchDist > 0) {
        const { setZoom, viewport } = useViewStore.getState();
        const scale = dist / lastPinchDist;
        const midX = (touch1.clientX + touch2.clientX) / 2;
        const midY = (touch1.clientY + touch2.clientY) / 2;

        const rect = (e.evt.target as HTMLElement)?.getBoundingClientRect?.();
        const x = rect ? midX - rect.left : midX;
        const y = rect ? midY - rect.top : midY;

        setZoom(viewport.zoom * scale, x, y);
      }

      lastPinchDist = dist;
    };

    // ===============================================
    // PREVENT BROWSER CONTEXT MENU
    // ===============================================
    const container = stage.container();
    const preventContextMenu = (e: Event) => e.preventDefault();
    container.addEventListener("contextmenu", preventContextMenu);

    // ===============================================
    // REGISTER EVENT LISTENERS
    // ===============================================
    stage.on("wheel", handleWheel);
    stage.on("mousedown", handleMouseDown);
    stage.on("mousemove", handleMouseMove);
    stage.on("mouseup", handleMouseUp);
    stage.on("mouseleave", handleMouseUp);

    // Touch events
    stage.on("touchstart", handleTouchStart);
    stage.on("touchmove", (e) => {
      if (e.evt.touches.length === 2) {
        handlePinch(e);
      } else {
        handleTouchMove(e);
      }
    });
    stage.on("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("contextmenu", preventContextMenu);
      stage.off("wheel", handleWheel);
      stage.off("mousedown", handleMouseDown);
      stage.off("mousemove", handleMouseMove);
      stage.off("mouseup", handleMouseUp);
      stage.off("mouseleave", handleMouseUp);
      stage.off("touchstart", handleTouchStart);
      stage.off("touchmove");
      stage.off("touchend", handleTouchEnd);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, [stageRef]);

  return null;
}
