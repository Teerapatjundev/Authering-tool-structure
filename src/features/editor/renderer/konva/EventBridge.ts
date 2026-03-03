/**
 * ===============================================
 * EVENT BRIDGE - จัดการ Mouse/Touch Events บน Canvas
 * ===============================================
 *
 * จัดการ events ทั้งหมดบน canvas:
 *
 * 1. WHEEL
 *    - Shift+Wheel → เลื่อนซ้าย-ขวา (เฉพาะซูมเกิน 100%)
 *    - Ctrl/Cmd+Wheel → Zoom เข้า/ออก (พร้อม clamp ขอบ + ดึงกลับกึ่งกลาง)
 *    - Wheel ปกติ → เลื่อนขึ้น-ลง (เฉพาะซูมเกิน 100%)
 *
 * 2. MOUSE DOWN
 *    - Transformer handles → ปล่อยให้ Transformer จัดการ
 *    - Right-click → Context Menu
 *    - Middle click / Pan tool → Pan
 *    - Select tool → เลือก node / marquee / Alt+drag duplicate
 *
 * 3. MOUSE MOVE
 *    - Panning
 *    - ลาก nodes ที่เลือก (พร้อม snap + canvas bounds)
 *    - Marquee selection
 *
 * 4. MOUSE UP → จบ drag + commit history
 *
 * 5. TOUCH → เหมือน mouse + long-press context menu + pinch to zoom
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
import { commitMoveWithOriginal } from "../../core/commands/transform";
import { useHistoryStore } from "../../core/history/historyStore";
import { InsertOp } from "../../core/history/ops";
import { generateNodeId } from "@/shared/utils/id";

// ===============================================
// Constants
// ===============================================

/** ระยะที่ขอบ document เลยขอบ editor ได้ (px) */
const OVERFLOW_PAD = 100;
/** อัตราการซูมต่อ 1 wheel tick */
const ZOOM_SCALE_BY = 1.05;
/** ระยะเวลา long-press เพื่อเปิด context menu (ms) */
const LONG_PRESS_MS = 500;

/** Konva Transformer anchor/element names */
const TRANSFORMER_ANCHORS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
  "rotater",
  "_anchor",
  "back",
];

// ===============================================
// Types
// ===============================================

interface EventBridgeProps {
  stageRef: React.RefObject<Konva.Stage>;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

// ===============================================
// Pure Utility Functions
// ===============================================

/** ขยาย selection ให้รวม nodes ทั้ง group */
function expandGroupIds(
  hitNodeId: string,
  allNodes: { id: string; groupId?: string }[],
): string[] {
  const hitNode = allNodes.find((n) => n.id === hitNodeId);
  if (!hitNode || !hitNode.groupId) return [hitNodeId];
  return allNodes.filter((n) => n.groupId === hitNode.groupId).map((n) => n.id);
}

/** ขยาย set ของ IDs ให้รวม group members ทั้งหมด */
function expandAllGroupIds(
  ids: string[],
  allNodes: { id: string; groupId?: string }[],
): string[] {
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

/** ตรวจสอบว่าเป็น macOS หรือไม่ */
function isMac(): boolean {
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
}

/** ตรวจสอบว่า Konva target เป็น Transformer handle หรือไม่ */
function isTransformerTarget(target: Konva.Node): boolean {
  const name = target?.name?.() || "";
  const cls = target?.className;
  const parentCls = target?.getParent()?.className;
  const grandParentCls = target?.getParent()?.getParent()?.className;

  return (
    TRANSFORMER_ANCHORS.some((anchor) => name.includes(anchor)) ||
    cls === "Transformer" ||
    parentCls === "Transformer" ||
    grandParentCls === "Transformer" ||
    target?.getParent()?.name?.()?.includes("_anchor") ||
    false
  );
}

/**
 * Clamp scroll delta ในแกนเดียว
 * คืนค่า clamped delta ที่ไม่ให้ document เลยขอบ editor เกิน OVERFLOW_PAD
 */
function clampScrollDelta(
  currentPos: number,
  rawDelta: number,
  docScreenSize: number,
  viewSize: number,
): number {
  const minPos = viewSize - docScreenSize - OVERFLOW_PAD;
  const maxPos = OVERFLOW_PAD;
  const newPos = currentPos + rawDelta;
  const clampedPos = Math.max(minPos, Math.min(maxPos, newPos));
  return clampedPos - currentPos;
}

/**
 * Clamp viewport position หลังซูม + ค่อยๆดึงกลับกึ่งกลางตอนซูมออก
 */
function clampViewportAfterZoom(
  pos: Point,
  docSize: { width: number; height: number },
  canvasSize: { width: number; height: number },
  zoom: number,
  isZoomingOut: boolean,
): Point {
  const docScreenW = docSize.width * zoom;
  const docScreenH = docSize.height * zoom;
  const centerX = (canvasSize.width - docScreenW) / 2;
  const centerY = (canvasSize.height - docScreenH) / 2;
  let cx = pos.x;
  let cy = pos.y;

  // แกน X
  if (docScreenW > canvasSize.width) {
    if (isZoomingOut) {
      const excess = (docScreenW - canvasSize.width) / canvasSize.width;
      const pull = Math.max(0, 1 - excess * 2);
      cx = cx + (centerX - cx) * pull * 0.3;
    }
    cx = Math.max(
      canvasSize.width - docScreenW - OVERFLOW_PAD,
      Math.min(OVERFLOW_PAD, cx),
    );
  } else {
    cx = centerX;
  }

  // แกน Y
  if (docScreenH > canvasSize.height) {
    if (isZoomingOut) {
      const excess = (docScreenH - canvasSize.height) / canvasSize.height;
      const pull = Math.max(0, 1 - excess * 2);
      cy = cy + (centerY - cy) * pull * 0.3;
    }
    cy = Math.max(
      canvasSize.height - docScreenH - OVERFLOW_PAD,
      Math.min(OVERFLOW_PAD, cy),
    );
  } else {
    cy = centerY;
  }

  return { x: cx, y: cy };
}

/**
 * สร้าง virtual nodes ที่ตำแหน่ง original + delta
 */
function buildVirtualNodes(
  selectedIds: string[],
  originalPositions: Map<string, Point>,
  nodes: any[],
  dx: number,
  dy: number,
): any[] {
  return selectedIds
    .map((id) => {
      const orig = originalPositions.get(id);
      const node = nodes.find((n: any) => n.id === id);
      if (!orig || !node) return null;
      return { ...node, x: orig.x + dx, y: orig.y + dy };
    })
    .filter(Boolean);
}

/**
 * Clamp drag delta ให้ bounding box ไม่ล้นขอบ document
 */
function clampDragDelta(
  groupBounds: { x: number; y: number; width: number; height: number },
  docWidth: number,
  docHeight: number,
  dx: number,
  dy: number,
): Point {
  let cx = dx;
  let cy = dy;
  if (groupBounds.x < 0) cx -= groupBounds.x;
  if (groupBounds.x + groupBounds.width > docWidth)
    cx -= groupBounds.x + groupBounds.width - docWidth;
  if (groupBounds.y < 0) cy -= groupBounds.y;
  if (groupBounds.y + groupBounds.height > docHeight)
    cy -= groupBounds.y + groupBounds.height - docHeight;
  return { x: cx, y: cy };
}

/**
 * คำนวณ snap + อัพเดทตำแหน่ง nodes
 */
function snapAndUpdateNodes(
  selectedIds: string[],
  originalPositions: Map<string, Point>,
  doc: any,
  dx: number,
  dy: number,
  withSpacingGuides: boolean,
): void {
  const clampedVirtual = buildVirtualNodes(
    selectedIds,
    originalPositions,
    doc.nodes,
    dx,
    dy,
  );

  const snapResult = snapNodes(
    clampedVirtual,
    doc.nodes,
    0,
    0,
    doc.width,
    doc.height,
  );

  const finalDx = dx + snapResult.dx;
  const finalDy = dy + snapResult.dy;

  useSnapGuidesStore.getState().setGuides(snapResult.guides);
  if (withSpacingGuides) {
    useSnapGuidesStore.getState().setSpacingGuides(snapResult.spacingGuides);
  }

  const updates = selectedIds.map((id) => {
    const orig = originalPositions.get(id);
    if (!orig) return { id, changes: {} };
    return { id, changes: { x: orig.x + finalDx, y: orig.y + finalDy } };
  });

  useDocStore.getState().updateNodes(updates);
}

// ===============================================
// Component
// ===============================================

export function EventBridge({ stageRef }: EventBridgeProps) {
  // ─── Refs ───
  const dragStartRef = useRef<Point | null>(null);
  const marqueeStartRef = useRef<Point | null>(null);
  const isDraggingRef = useRef(false);
  const isMarqueeRef = useRef(false);
  const originalPositionsRef = useRef<Map<string, Point>>(new Map());
  const accDeltaRef = useRef<Point>({ x: 0, y: 0 });
  const isAltDuplicatingRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // ─────────────────────────────────────────────
    // Shared helpers (closure over refs)
    // ─────────────────────────────────────────────

    /** เริ่มลาก - บันทึก original positions, คืนค่า expanded IDs */
    function initDrag(
      worldPos: Point,
      nodeIds: string[],
      nodes: any[],
    ): string[] {
      isDraggingRef.current = true;
      dragStartRef.current = worldPos;
      accDeltaRef.current = { x: 0, y: 0 };
      originalPositionsRef.current.clear();

      const allIds = expandAllGroupIds(nodeIds, nodes);
      nodes
        .filter((n: any) => allIds.includes(n.id))
        .forEach((n: any) => {
          originalPositionsRef.current.set(n.id, { x: n.x, y: n.y });
        });
      return allIds;
    }

    /** Process drag move (shared by mouse & touch) */
    function processDragMove(
      worldPos: Point,
      withSpacingGuides: boolean,
    ): void {
      if (!isDraggingRef.current || !dragStartRef.current) return;

      // สะสม raw delta
      const frameDx = worldPos.x - dragStartRef.current.x;
      const frameDy = worldPos.y - dragStartRef.current.y;
      accDeltaRef.current.x += frameDx;
      accDeltaRef.current.y += frameDy;
      dragStartRef.current = worldPos;

      const dx = accDeltaRef.current.x;
      const dy = accDeltaRef.current.y;

      const selectedIds = useSelectionStore.getState().getSelectedIds();
      if (selectedIds.length === 0) return;

      const { doc } = useDocStore.getState();
      if (!doc) return;

      const page =
        doc.pages.find((p: any) => p.id === doc.activePageId) ?? doc.pages[0];
      if (!page) return;

      // สร้าง virtual nodes เพื่อคำนวณ bounds
      const virtualNodes = buildVirtualNodes(
        selectedIds,
        originalPositionsRef.current,
        page.nodes,
        dx,
        dy,
      );
      if (virtualNodes.length === 0) return;

      const groupBounds = getMultiSelectionBounds(virtualNodes);
      if (!groupBounds) return;

      // Clamp + snap + update
      const clamped = clampDragDelta(
        groupBounds,
        page.width,
        page.height,
        dx,
        dy,
      );
      snapAndUpdateNodes(
        selectedIds,
        originalPositionsRef.current,
        { nodes: page.nodes, width: page.width, height: page.height },
        clamped.x,
        clamped.y,
        withSpacingGuides,
      );
    }

    /** Process marquee selection */
    function processMarquee(worldPos: Point): void {
      if (!isMarqueeRef.current || !marqueeStartRef.current) return;

      const marqueeBounds = {
        x: Math.min(marqueeStartRef.current.x, worldPos.x),
        y: Math.min(marqueeStartRef.current.y, worldPos.y),
        width: Math.abs(worldPos.x - marqueeStartRef.current.x),
        height: Math.abs(worldPos.y - marqueeStartRef.current.y),
      };

      useMarqueeStore.getState().setBounds(marqueeBounds);

      const { doc } = useDocStore.getState();
      if (!doc) return;

      const page =
        doc.pages.find((p: any) => p.id === doc.activePageId) ?? doc.pages[0];
      if (!page) return;

      const intersecting = page.nodes.filter((node: any) => {
        if (node.locked) return false;
        const nodeBounds = {
          x: node.x - node.width / 2,
          y: node.y - node.height / 2,
          width: node.width,
          height: node.height,
        };
        return boundsIntersect(nodeBounds, marqueeBounds);
      });

      useSelectionStore.getState().selectMultiple(
        expandAllGroupIds(
          intersecting.map((n: any) => n.id),
          page.nodes,
        ),
      );
    }

    /** บันทึก history หลังจบ drag */
    function commitDragHistory(): void {
      const selectedIds = useSelectionStore.getState().getSelectedIds();
      if (selectedIds.length === 0 || originalPositionsRef.current.size === 0)
        return;

      const { doc } = useDocStore.getState();
      if (!doc) return;

      const page =
        doc.pages.find((p: any) => p.id === doc.activePageId) ?? doc.pages[0];
      if (!page) return;

      const newPositions = new Map<string, Point>();
      selectedIds.forEach((id: string) => {
        const node = page.nodes.find((n: any) => n.id === id);
        if (node) newPositions.set(id, { x: node.x, y: node.y });
      });
      commitMoveWithOriginal(originalPositionsRef.current, newPositions);
    }

    /** Reset ทุก state หลังจบ drag/selection */
    function resetAllState(): void {
      isDraggingRef.current = false;
      isAltDuplicatingRef.current = false;
      isMarqueeRef.current = false;
      dragStartRef.current = null;
      marqueeStartRef.current = null;
      originalPositionsRef.current.clear();
      accDeltaRef.current = { x: 0, y: 0 };
      useSnapGuidesStore.getState().clearGuides();
      useMarqueeStore.getState().clear();
    }

    /** เปิด context menu + เลือก node ถ้าคลิกโดน */
    function openContextMenu(
      worldPos: Point,
      clientX: number,
      clientY: number,
    ): void {
      const { doc } = useDocStore.getState();
      if (!doc) return;

      const page =
        doc.pages.find((p: any) => p.id === doc.activePageId) ?? doc.pages[0];
      if (!page) return;

      const hitNode = findTopNodeAt(page.nodes, worldPos.x, worldPos.y);
      if (hitNode) {
        const { selectedIds, selectMultiple } = useSelectionStore.getState();
        if (!selectedIds.has(hitNode.id)) {
          selectMultiple(expandGroupIds(hitNode.id, page.nodes));
        }
      }
      useContextMenuStore
        .getState()
        .open(clientX, clientY, hitNode?.id ?? null);
    }

    /** Alt + drag = duplicate selected nodes แล้วลาก */
    function handleAltDuplicate(selectedNodes: any[], worldPos: Point): void {
      const clonedNodes = selectedNodes.map((n: any) => ({
        ...JSON.parse(JSON.stringify(n)),
        id: generateNodeId(),
      }));

      const insertOp: InsertOp = {
        type: "insert",
        timestamp: Date.now(),
        nodes: clonedNodes,
      };
      useHistoryStore.getState().commit(insertOp);

      useSelectionStore
        .getState()
        .selectMultiple(clonedNodes.map((n: any) => n.id));

      isDraggingRef.current = true;
      isAltDuplicatingRef.current = true;
      dragStartRef.current = worldPos;
      accDeltaRef.current = { x: 0, y: 0 };
      originalPositionsRef.current.clear();
      clonedNodes.forEach((n: any) => {
        originalPositionsRef.current.set(n.id, { x: n.x, y: n.y });
      });
      useVideoPlayStore.getState().stopVideo();
    }

    /**
     * ตรวจสอบว่าคลิก/touch อยู่ในพื้นที่ selection bounds + จัดการ
     * คืน true ถ้าจัดการแล้ว (ลาก / locked), false ถ้าไม่อยู่ใน bounds
     */
    function tryDragExistingSelection(
      worldPos: Point,
      selectedNodes: any[],
      currentSelectedIds: string[],
      allNodes: any[],
      handlePadding: number,
      altKey: boolean,
    ): boolean {
      if (selectedNodes.length === 0) return false;

      const selectionBounds = getMultiSelectionBounds(selectedNodes);
      if (!selectionBounds) return false;

      const expandedBounds = {
        x: selectionBounds.x - handlePadding,
        y: selectionBounds.y - handlePadding,
        width: selectionBounds.width + handlePadding * 2,
        height: selectionBounds.height + handlePadding * 2,
      };

      if (!boundsContainsPoint(expandedBounds, worldPos.x, worldPos.y))
        return false;

      // nodes ทั้งหมดถูกล็อค → ไม่ให้ลาก
      if (selectedNodes.every((n: any) => n.locked)) return true;

      // Alt + drag = duplicate
      if (altKey) {
        handleAltDuplicate(selectedNodes, worldPos);
        return true;
      }

      // ลาก selection ที่มีอยู่
      const allIds = initDrag(worldPos, currentSelectedIds, allNodes);
      if (allIds.length > currentSelectedIds.length) {
        useSelectionStore.getState().selectMultiple(allIds);
      }
      useVideoPlayStore.getState().stopVideo();
      return true;
    }

    // ─────────────────────────────────────────────
    // WHEEL
    // ─────────────────────────────────────────────

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const isCtrlOrCmd = isMac() ? e.evt.metaKey : e.evt.ctrlKey;

      // ── Branch 1: Shift + Wheel = เลื่อนซ้าย-ขวา ──
      // เลื่อนได้เมื่อ document (บนหน้าจอ) กว้างกว่า viewport (เหมือน Canva)
      if (e.evt.shiftKey && !isCtrlOrCmd) {
        const { pan, viewport, canvasSize } = useViewStore.getState();
        const { doc } = useDocStore.getState();
        if (doc) {
          const page =
            doc.pages.find((p: any) => p.id === doc.activePageId) ?? doc.pages[0];
          if (!page) return;
          const docScreenWidth = page.width * viewport.zoom;
          if (docScreenWidth > canvasSize.width) {
            const delta = clampScrollDelta(
              viewport.x,
              -e.evt.deltaY,
              docScreenWidth,
              canvasSize.width,
            );
            if (Math.abs(delta) > 0.01) pan(delta, 0);
          }
        }
        return;
      }

      // ── Branch 2: Ctrl/Cmd + Wheel = Zoom ──
      if (isCtrlOrCmd) {
        const { setZoom, viewport } = useViewStore.getState();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const newZoom =
          direction > 0
            ? viewport.zoom * ZOOM_SCALE_BY
            : viewport.zoom / ZOOM_SCALE_BY;

        setZoom(newZoom, pointer.x, pointer.y);

        // Clamp + ดึงกลับกึ่งกลางตอนซูมออก
        const {
          viewport: v,
          canvasSize,
          setViewport,
        } = useViewStore.getState();
        const { doc } = useDocStore.getState();
        if (doc) {
          const page =
            doc.pages.find((p: any) => p.id === doc.activePageId) ?? doc.pages[0];
          if (!page) return;
          const clamped = clampViewportAfterZoom(
            v,
            { width: page.width, height: page.height },
            canvasSize,
            v.zoom,
            direction < 0,
          );
          if (clamped.x !== v.x || clamped.y !== v.y) {
            setViewport({ x: clamped.x, y: clamped.y });
          }
        }
        return;
      }

      // ── Branch 3: Wheel ปกติ = เลื่อนขึ้น-ลง ──
      // เลื่อนได้เมื่อ document (บนหน้าจอ) สูงกว่า viewport (เหมือน Canva)
      {
        const { pan, viewport, canvasSize } = useViewStore.getState();
        const { doc } = useDocStore.getState();
        if (doc) {
          const page =
            doc.pages.find((p: any) => p.id === doc.activePageId) ?? doc.pages[0];
          if (!page) return;
          const docScreenHeight = page.height * viewport.zoom;
          if (docScreenHeight > canvasSize.height) {
            const delta = clampScrollDelta(
              viewport.y,
              -e.evt.deltaY,
              docScreenHeight,
              canvasSize.height,
            );
            if (Math.abs(delta) > 0.01) pan(0, delta);
          }
        }
      }
    };

    // ─────────────────────────────────────────────
    // MOUSE DOWN
    // ─────────────────────────────────────────────

    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
      const { activeTool } = useToolStore.getState();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const worldPos = useViewStore
        .getState()
        .screenToWorld(pointer.x, pointer.y);

      // Transformer handle → ปล่อยให้ Transformer จัดการ
      if (isTransformerTarget(e.target)) return;

      // Right-click → Context Menu
      if (e.evt.button === 2) {
        e.evt.preventDefault();
        openContextMenu(worldPos, e.evt.clientX, e.evt.clientY);
        return;
      }

      useContextMenuStore.getState().close();

      // Middle mouse / Pan tool → Pan
      if (e.evt.button === 1 || activeTool === "pan") {
        useViewStore.getState().setIsPanning(true);
        dragStartRef.current = { x: pointer.x, y: pointer.y };
        return;
      }

      // Select tool
      if (activeTool === "select") {
        handleSelectDown(worldPos, e.evt.shiftKey, e.evt.altKey);
      }
    };

    /** Select tool: mouse down logic */
    function handleSelectDown(
      worldPos: Point,
      shiftKey: boolean,
      altKey: boolean,
    ): void {
      const { doc } = useDocStore.getState();
      if (!doc) return;

      const page =
        doc.pages.find((p: any) => p.id === doc.activePageId) ?? doc.pages[0];
      if (!page) return;

      const { viewport } = useViewStore.getState();
      const { selectedIds, getSelectedIds } = useSelectionStore.getState();
      const currentSelectedIds = getSelectedIds();
      const selectedNodes = page.nodes.filter((n: any) =>
        currentSelectedIds.includes(n.id),
      );

      // หา node ที่คลิกโดนก่อน เพื่อให้คลิกเลือก node ใหม่ได้แม้อยู่ใน selection bounds เดิม
      const hitNode = findTopNodeAt(page.nodes, worldPos.x, worldPos.y);
      const hitGroupIds = hitNode ? expandGroupIds(hitNode.id, page.nodes) : [];
      const hitOnUnselectedNode =
        !!hitNode && !hitGroupIds.every((id) => selectedIds.has(id));

      // ตรวจสอบว่าคลิกอยู่ในพื้นที่ selection หรือไม่
      const handlePadding = 30 / viewport.zoom;
      if (
        !hitOnUnselectedNode &&
        tryDragExistingSelection(
          worldPos,
          selectedNodes,
          currentSelectedIds,
          page.nodes,
          handlePadding,
          altKey,
        )
      ) {
        return;
      }

      if (hitNode) {
        // หยุดเล่น video ถ้าคลิกที่ node อื่น
        const { playingNodeId, stopVideo } = useVideoPlayStore.getState();
        if (hitNode.type !== "video" || hitNode.id !== playingNodeId) {
          stopVideo();
        }

        // ขยาย selection ให้รวมทั้ง group
        const groupIds = hitGroupIds;

        if (shiftKey) {
          // Shift+click = toggle group selection
          const currentIds = new Set(getSelectedIds());
          const allInGroup = groupIds.every((id) => currentIds.has(id));
          if (allInGroup) {
            groupIds.forEach((id) => currentIds.delete(id));
          } else {
            groupIds.forEach((id) => currentIds.add(id));
          }
          useSelectionStore.getState().selectMultiple(Array.from(currentIds));
        } else if (!selectedIds.has(hitNode.id)) {
          useSelectionStore.getState().selectMultiple(groupIds);
        }

        // node ถูกล็อค → เลือกได้แต่ไม่ให้ลาก
        if (hitNode.locked) return;

        // เริ่มลาก
        initDrag(
          worldPos,
          useSelectionStore.getState().getSelectedIds(),
          page.nodes,
        );
      } else {
        // คลิกที่ว่าง → marquee selection
        if (!shiftKey) {
          useSelectionStore.getState().clearSelection();
        }
        useVideoPlayStore.getState().stopVideo();
        isMarqueeRef.current = true;
        marqueeStartRef.current = worldPos;
      }
    }

    // ─────────────────────────────────────────────
    // MOUSE MOVE
    // ─────────────────────────────────────────────

    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Panning
      if (useViewStore.getState().isPanning && dragStartRef.current) {
        const dx = pointer.x - dragStartRef.current.x;
        const dy = pointer.y - dragStartRef.current.y;
        useViewStore.getState().pan(dx, dy);
        dragStartRef.current = { x: pointer.x, y: pointer.y };
        return;
      }

      const worldPos = useViewStore
        .getState()
        .screenToWorld(pointer.x, pointer.y);
      processDragMove(worldPos, true);
      processMarquee(worldPos);
    };

    // ─────────────────────────────────────────────
    // MOUSE UP
    // ─────────────────────────────────────────────

    const handleMouseUp = () => {
      const wasDragging = isDraggingRef.current;

      if (useViewStore.getState().isPanning) {
        useViewStore.getState().setIsPanning(false);
      }

      if (wasDragging) {
        commitDragHistory();
      }

      resetAllState();
    };

    // ─────────────────────────────────────────────
    // TOUCH START
    // ─────────────────────────────────────────────

    const handleTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
      e.evt.preventDefault();

      const touch = e.evt.touches[0];
      if (!touch) return;

      const { activeTool } = useToolStore.getState();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const { screenToWorld, viewport } = useViewStore.getState();
      const worldPos = screenToWorld(pointer.x, pointer.y);

      useContextMenuStore.getState().close();

      // Long-press → Context Menu
      longPressTriggeredRef.current = false;
      const touchClientX = touch.clientX;
      const touchClientY = touch.clientY;

      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        isDraggingRef.current = false;
        openContextMenu(worldPos, touchClientX, touchClientY);
      }, LONG_PRESS_MS);

      // Two-finger → pan
      if (e.evt.touches.length >= 2) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        useViewStore.getState().setIsPanning(true);
        dragStartRef.current = { x: pointer.x, y: pointer.y };
        return;
      }

      // Pan tool
      if (activeTool === "pan") {
        useViewStore.getState().setIsPanning(true);
        dragStartRef.current = { x: pointer.x, y: pointer.y };
        return;
      }

      // Select tool
      if (activeTool === "select") {
        handleTouchSelectDown(worldPos, viewport);
      }
    };

    /** Touch select tool: down logic (ไม่มี shift/alt) */
    function handleTouchSelectDown(worldPos: Point, viewport: any): void {
      const { doc } = useDocStore.getState();
      if (!doc) return;

      const page =
        doc.pages.find((p: any) => p.id === doc.activePageId) ?? doc.pages[0];
      if (!page) return;

      const { selectedIds, getSelectedIds } = useSelectionStore.getState();
      const currentSelectedIds = getSelectedIds();
      const selectedNodes = page.nodes.filter((n: any) =>
        currentSelectedIds.includes(n.id),
      );

      // หา node ที่ touch โดนก่อน เพื่อให้เปลี่ยน selection ได้แม้อยู่ใน bounds เดิม
      const hitNode = findTopNodeAt(page.nodes, worldPos.x, worldPos.y);
      const hitGroupIds = hitNode ? expandGroupIds(hitNode.id, page.nodes) : [];
      const hitOnUnselectedNode =
        !!hitNode && !hitGroupIds.every((id) => selectedIds.has(id));

      // ตรวจสอบว่า touch อยู่ใน selection bounds (padding ใหญ่กว่า mouse)
      const handlePadding = 40 / viewport.zoom;
      if (
        !hitOnUnselectedNode &&
        tryDragExistingSelection(
          worldPos,
          selectedNodes,
          currentSelectedIds,
          page.nodes,
          handlePadding,
          false,
        )
      ) {
        return;
      }

      if (hitNode) {
        const groupIds = hitGroupIds;
        if (!selectedIds.has(hitNode.id)) {
          useSelectionStore.getState().selectMultiple(groupIds);
        }

        if (hitNode.locked) return;

        initDrag(
          worldPos,
          useSelectionStore.getState().getSelectedIds(),
          page.nodes,
        );
      } else {
        useSelectionStore.getState().clearSelection();
      }
    }

    // ─────────────────────────────────────────────
    // TOUCH MOVE
    // ─────────────────────────────────────────────

    const handleTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
      e.evt.preventDefault();

      // ยกเลิก long-press ถ้ามีการเลื่อนนิ้ว
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (longPressTriggeredRef.current) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Panning (single-touch pan หรือหลัง two-finger start)
      if (useViewStore.getState().isPanning && dragStartRef.current) {
        const dx = pointer.x - dragStartRef.current.x;
        const dy = pointer.y - dragStartRef.current.y;
        useViewStore.getState().pan(dx, dy);
        dragStartRef.current = { x: pointer.x, y: pointer.y };
        return;
      }

      const worldPos = useViewStore
        .getState()
        .screenToWorld(pointer.x, pointer.y);
      processDragMove(worldPos, false);
    };

    // ─────────────────────────────────────────────
    // TOUCH END
    // ─────────────────────────────────────────────

    const handleTouchEnd = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        return;
      }

      handleMouseUp();
    };

    // ─────────────────────────────────────────────
    // PINCH TO ZOOM
    // ─────────────────────────────────────────────

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

    // ─────────────────────────────────────────────
    // Register Event Listeners
    // ─────────────────────────────────────────────

    const container = stage.container();
    const preventContextMenu = (e: Event) => e.preventDefault();
    container.addEventListener("contextmenu", preventContextMenu);

    stage.on("wheel", handleWheel);
    stage.on("mousedown", handleMouseDown);
    stage.on("mousemove", handleMouseMove);
    stage.on("mouseup", handleMouseUp);
    stage.on("mouseleave", handleMouseUp);

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
