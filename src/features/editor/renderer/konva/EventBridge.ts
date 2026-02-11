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
import { findTopNodeAt } from "../../core/geometry/hitTest";
import {
  boundsIntersect,
  boundsContainsPoint,
  getMultiSelectionBounds,
} from "../../core/geometry/bounds";
import { snapNode } from "../../core/geometry/snap";
import {
  commitMove,
  commitMoveWithOriginal,
} from "../../core/commands/transform";

interface EventBridgeProps {
  stageRef: React.RefObject<Konva.Stage>;
  width: number;
  height: number;
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
              // คลิกอยู่ในพื้นที่ selection (รวม handles) → เริ่มลากได้เลย ไม่ต้อง clear selection
              isDraggingRef.current = true;
              dragStartRef.current = worldPos;
              // บันทึกตำแหน่งเดิมของ selected nodes สำหรับ undo
              originalPositionsRef.current.clear();
              selectedNodes.forEach((n) => {
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

          // คลิกที่ node
          if (e.evt.shiftKey) {
            // Shift+click = toggle selection
            toggleSelect(hitNode.id);
          } else {
            // ถ้ายังไม่ได้เลือก node นี้ → เลือก
            if (!selectedIds.has(hitNode.id)) {
              select(hitNode.id);
            }
          }

          // เริ่มลาก
          isDraggingRef.current = true;
          dragStartRef.current = worldPos;
          // บันทึกตำแหน่งเดิมของ selected nodes สำหรับ undo
          originalPositionsRef.current.clear();
          // รวม hitNode และ nodes ที่เลือกแล้ว
          const nodesToTrack = e.evt.shiftKey
            ? doc.nodes.filter(
                (n) => selectedIds.has(n.id) || n.id === hitNode.id,
              )
            : selectedIds.has(hitNode.id)
              ? doc.nodes.filter((n) => selectedIds.has(n.id))
              : [hitNode];
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

      // 2. Dragging selected nodes
      if (isDraggingRef.current && dragStartRef.current) {
        let dx = worldPos.x - dragStartRef.current.x;
        let dy = worldPos.y - dragStartRef.current.y;

        const { getSelectedIds } = useSelectionStore.getState();
        const selectedIds = getSelectedIds();

        if (selectedIds.length > 0) {
          const { doc, updateNodes } = useDocStore.getState();
          if (!doc) return;

          // หา selected nodes
          const selectedNodes = doc.nodes.filter((n) =>
            selectedIds.includes(n.id),
          );
          if (selectedNodes.length === 0) return;

          // คำนวณ bounding box ของกลุ่มทั้งหมด
          const groupBounds = getMultiSelectionBounds(selectedNodes);
          if (!groupBounds) return;

          // Clamp dx/dy ให้ bounding box ของกลุ่มไม่ล้นขอบ canvas
          // ขอบซ้าย: groupBounds.x + dx >= 0
          // ขอบขวา: groupBounds.x + groupBounds.width + dx <= doc.width
          // ขอบบน: groupBounds.y + dy >= 0
          // ขอบล่าง: groupBounds.y + groupBounds.height + dy <= doc.height

          if (groupBounds.x + dx < 0) {
            dx = -groupBounds.x;
          }
          if (groupBounds.x + groupBounds.width + dx > doc.width) {
            dx = doc.width - groupBounds.x - groupBounds.width;
          }
          if (groupBounds.y + dy < 0) {
            dy = -groupBounds.y;
          }
          if (groupBounds.y + groupBounds.height + dy > doc.height) {
            dy = doc.height - groupBounds.y - groupBounds.height;
          }

          // ลอง snap กับ node อื่น (ใช้ first node เป็นตัวแทน)
          const firstSelectedId = selectedIds[0];
          const firstNode = doc.nodes.find((n) => n.id === firstSelectedId);

          if (firstNode) {
            const snapResult = snapNode(firstNode, doc.nodes, { x: dx, y: dy });

            // แสดง snap guides
            const guides: Array<{
              type: "vertical" | "horizontal";
              position: number;
            }> = [];
            if (snapResult.snappedX) {
              guides.push({ type: "vertical", position: snapResult.x });
            }
            if (snapResult.snappedY) {
              guides.push({ type: "horizontal", position: snapResult.y });
            }
            useSnapGuidesStore.getState().setGuides(guides);
          }

          // อัพเดทตำแหน่ง nodes ด้วย dx/dy เท่ากันทุกตัว
          const updates = selectedIds.map((id: string) => {
            const node = doc.nodes.find((n) => n.id === id);
            if (!node) return { id, changes: {} };

            return {
              id,
              changes: {
                x: node.x + dx,
                y: node.y + dy,
              },
            };
          });

          updateNodes(updates);
        }

        dragStartRef.current = worldPos;
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
            .selectMultiple(intersecting.map((n) => n.id));
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
      isMarqueeRef.current = false;
      dragStartRef.current = null;
      marqueeStartRef.current = null;
      originalPositionsRef.current.clear();
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

      // Two-finger touch = pan
      if (e.evt.touches.length >= 2) {
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
              originalPositionsRef.current.clear();
              selectedNodes.forEach((n) => {
                originalPositionsRef.current.set(n.id, { x: n.x, y: n.y });
              });
              return;
            }
          }
        }

        const hitNode = findTopNodeAt(doc.nodes, worldPos.x, worldPos.y);

        if (hitNode) {
          if (!selectedIds.has(hitNode.id)) {
            select(hitNode.id);
          }
          isDraggingRef.current = true;
          dragStartRef.current = worldPos;
          originalPositionsRef.current.clear();
          const nodesToTrack = selectedIds.has(hitNode.id)
            ? doc.nodes.filter((n) => selectedIds.has(n.id))
            : [hitNode];
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
        const dx = worldPos.x - dragStartRef.current.x;
        const dy = worldPos.y - dragStartRef.current.y;

        const { getSelectedIds } = useSelectionStore.getState();
        const selectedIds = getSelectedIds();

        if (selectedIds.length > 0) {
          const { doc, updateNodes } = useDocStore.getState();
          if (!doc) return;

          const updates = selectedIds.map((id: string) => {
            const node = doc.nodes.find((n) => n.id === id);
            if (!node) return { id, changes: {} };

            let newX = (node?.x || 0) + dx;
            let newY = (node?.y || 0) + dy;

            const halfW = node.width / 2;
            const halfH = node.height / 2;

            if (newX - halfW < 0) newX = halfW;
            if (newX + halfW > doc.width) newX = doc.width - halfW;
            if (newY - halfH < 0) newY = halfH;
            if (newY + halfH > doc.height) newY = doc.height - halfH;

            return { id, changes: { x: newX, y: newY } };
          });

          updateNodes(updates);
        }

        dragStartRef.current = worldPos;
      }
    };

    const handleTouchEnd = () => {
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
      stage.off("wheel", handleWheel);
      stage.off("mousedown", handleMouseDown);
      stage.off("mousemove", handleMouseMove);
      stage.off("mouseup", handleMouseUp);
      stage.off("mouseleave", handleMouseUp);
      stage.off("touchstart", handleTouchStart);
      stage.off("touchmove");
      stage.off("touchend", handleTouchEnd);
    };
  }, [stageRef]);

  return null;
}
