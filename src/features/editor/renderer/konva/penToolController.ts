/**
 * ===============================================
 * PEN TOOL CONTROLLER - จัดการปากกา/ไฮไลท์/ยางลบ
 * ===============================================
 *
 * รวม logic ของเครื่องมือวาดเส้น:
 * - เริ่มวาด / วาดต่อ / จบการวาด
 * - smoothing เส้นปากกาและไฮไลท์
 * - ลบเส้นด้วยยางลบ (hit test ใกล้เส้น)
 * - commit history สำหรับ undo/redo
 */

import type { MutableRefObject } from "react";
import { useDocStore } from "../../stores/docStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useContextMenuStore } from "../../stores/contextMenuStore";
import { useVideoPlayStore } from "../../stores/videoPlayStore";
import { useHistoryStore } from "../../core/history/historyStore";
import { DeleteOp, InsertOp } from "../../core/history/ops";
import { generateNodeId } from "@/shared/utils/id";
import { Node as EditorNode, PathNode } from "../../core/doc/types";

/** จุดพิกัดใน world space */
export interface Point {
  x: number;
  y: number;
}

/** style ของเครื่องมือวาดเส้น */
interface FreehandStyle {
  mode: "pen" | "highlighter";
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

/** ระยะยางลบ (world px) */
const ERASER_RADIUS = 12;
/** ระยะห่างขั้นต่ำระหว่างจุดของเส้นวาด เพื่อลด jitter */
const FREEHAND_MIN_POINT_DIST = 0.8;
/** ค่าสำหรับทำ smoothing เส้น (ยิ่งน้อยยิ่งลื่นแต่หน่วง) */
const PEN_SMOOTHING_ALPHA = 0.28;
const HIGHLIGHTER_SMOOTHING_ALPHA = 0.35;

/** refs ที่แชร์สถานะการวาดระหว่าง EventBridge กับ controller นี้ */
interface FreehandRefs {
  isFreehandDrawingRef: MutableRefObject<boolean>;
  currentPathIdRef: MutableRefObject<string | null>;
  currentPathPointsRef: MutableRefObject<Point[]>;
  isErasingRef: MutableRefObject<boolean>;
  erasedNodeIdsRef: MutableRefObject<Set<string>>;
  erasedNodesRef: MutableRefObject<EditorNode[]>;
}

/** บังคับจุดให้อยู่ภายในขอบเอกสาร */
function clampPointToDoc(
  point: Point,
  doc: { width: number; height: number },
): Point {
  return {
    x: Math.max(0, Math.min(doc.width, point.x)),
    y: Math.max(0, Math.min(doc.height, point.y)),
  };
}

/**
 * สร้าง geometry ของ path จาก absolute points
 * - คำนวณกรอบ (x,y,width,height)
 * - แปลง points เป็น relative ภายในกรอบเพื่อเก็บใน node
 */
function buildPathGeometry(points: Point[], strokeWidth: number): {
  x: number;
  y: number;
  width: number;
  height: number;
  relativePoints: number[];
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const padding = Math.max(2, strokeWidth / 2 + 1);
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const relativePoints = points.flatMap((p) => [p.x - minX, p.y - minY]);

  return {
    x: minX + width / 2,
    y: minY + height / 2,
    width,
    height,
    relativePoints,
  };
}

/** ระยะจากจุดไปยังเส้นตรง segment a-b */
function pointToSegmentDistance(point: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = point.x - a.x;
  const apy = point.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return Math.hypot(apx, apy);
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / lenSq));
  const projX = a.x + abx * t;
  const projY = a.y + aby * t;
  return Math.hypot(point.x - projX, point.y - projY);
}

/** ตรวจว่า point อยู่ใกล้เส้น path พอสำหรับใช้เป็น eraser hit test หรือไม่ */
function isPointNearPath(pathNode: PathNode, point: Point, radius: number): boolean {
  const left = pathNode.x - pathNode.width / 2;
  const top = pathNode.y - pathNode.height / 2;
  const absPoints: Point[] = [];

  for (let i = 0; i < pathNode.points.length; i += 2) {
    absPoints.push({ x: left + pathNode.points[i], y: top + pathNode.points[i + 1] });
  }

  if (absPoints.length < 2) {
    if (absPoints.length === 1) {
      return Math.hypot(point.x - absPoints[0].x, point.y - absPoints[0].y) <= radius;
    }
    return false;
  }

  const threshold = radius + pathNode.strokeWidth / 2;
  for (let i = 0; i < absPoints.length - 1; i++) {
    if (pointToSegmentDistance(point, absPoints[i], absPoints[i + 1]) <= threshold) {
      return true;
    }
  }
  return false;
}

/** smooth จุดใหม่จากจุดก่อนหน้า เพื่อลด jitter ตอนวาด */
function smoothFreehandPoint(
  rawPoint: Point,
  lastPoint: Point,
  mode: "pen" | "highlighter",
): Point {
  const alpha =
    mode === "highlighter"
      ? HIGHLIGHTER_SMOOTHING_ALPHA
      : PEN_SMOOTHING_ALPHA;
  return {
    x: lastPoint.x + (rawPoint.x - lastPoint.x) * alpha,
    y: lastPoint.y + (rawPoint.y - lastPoint.y) * alpha,
  };
}

/** preset ของปากกา/ไฮไลท์ */
function getFreehandStyle(tool: "pen" | "highlighter"): FreehandStyle {
  if (tool === "highlighter") {
    return {
      mode: "highlighter",
      stroke: "#facc15",
      strokeWidth: 16,
      opacity: 0.35,
    };
  }
  return {
    mode: "pen",
    stroke: "#111827",
    strokeWidth: 3,
    opacity: 1,
  };
}

/**
 * เริ่มวาดเส้นใหม่
 * - สร้าง PathNode
 * - commit เข้า history เป็น InsertOp
 * - เซ็ตสถานะ drawing refs
 */
export function beginFreehandDrawing(
  worldPos: Point,
  tool: "pen" | "highlighter",
  refs: FreehandRefs,
): void {
  const { doc } = useDocStore.getState();
  if (!doc) return;

  const start = clampPointToDoc(worldPos, doc);
  const style = getFreehandStyle(tool);
  const geometry = buildPathGeometry([start], style.strokeWidth);
  const pathId = generateNodeId();

  const node: PathNode = {
    id: pathId,
    type: "path",
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    rotation: 0,
    opacity: style.opacity,
    locked: false,
    visible: true,
    points: geometry.relativePoints,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    mode: style.mode,
  };

  const insertOp: InsertOp = {
    type: "insert",
    timestamp: Date.now(),
    nodes: [node],
  };
  useHistoryStore.getState().commit(insertOp);

  refs.isFreehandDrawingRef.current = true;
  refs.currentPathIdRef.current = pathId;
  refs.currentPathPointsRef.current = [start];
  useSelectionStore.getState().clearSelection();
  useContextMenuStore.getState().close();
  useVideoPlayStore.getState().stopVideo();
}

/** เพิ่มจุดระหว่างลาก และอัปเดต node ปัจจุบันแบบ realtime */
export function appendFreehandPoint(worldPos: Point, refs: FreehandRefs): void {
  if (!refs.isFreehandDrawingRef.current || !refs.currentPathIdRef.current) return;
  const { doc } = useDocStore.getState();
  if (!doc) return;

  const pathNode = doc.nodes.find(
    (n) => n.id === refs.currentPathIdRef.current,
  ) as PathNode | undefined;
  if (!pathNode) return;

  const rawPoint = clampPointToDoc(worldPos, doc);
  const points = refs.currentPathPointsRef.current;
  const lastPoint = points[points.length - 1];
  const next = lastPoint
    ? smoothFreehandPoint(rawPoint, lastPoint, pathNode.mode)
    : rawPoint;

  if (
    lastPoint &&
    Math.hypot(next.x - lastPoint.x, next.y - lastPoint.y) <
      FREEHAND_MIN_POINT_DIST
  ) {
    return;
  }

  points.push(next);

  const geometry = buildPathGeometry(points, pathNode.strokeWidth);

  useDocStore.getState().updateNode(pathNode.id, {
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    points: geometry.relativePoints,
  } as Partial<PathNode>);
}

/**
 * จบการวาดเส้น
 * - ถ้าเป็นจุดเดียวจะเติมอีกจุดเพื่อให้ render ได้
 * - reset drawing refs
 * - trigger autosave
 */
export function endFreehandDrawing(refs: FreehandRefs): void {
  if (refs.currentPathPointsRef.current.length === 1) {
    const p = refs.currentPathPointsRef.current[0];
    refs.currentPathPointsRef.current.push({ ...p });

    const pathId = refs.currentPathIdRef.current;
    if (pathId) {
      const { doc } = useDocStore.getState();
      const pathNode = doc?.nodes.find((n) => n.id === pathId) as
        | PathNode
        | undefined;
      if (pathNode) {
        const geometry = buildPathGeometry(
          refs.currentPathPointsRef.current,
          pathNode.strokeWidth,
        );
        useDocStore.getState().updateNode(pathNode.id, {
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
          points: geometry.relativePoints,
        } as Partial<PathNode>);
      }
    }
  }

  refs.isFreehandDrawingRef.current = false;
  refs.currentPathIdRef.current = null;
  refs.currentPathPointsRef.current = [];
  useDocStore.getState().autoSave();
}

/** ลบเส้นที่โดนยางลบในตำแหน่ง worldPos และสะสมรายการสำหรับ undo */
export function eraseAtPoint(worldPos: Point, refs: FreehandRefs): void {
  const { doc, removeNodes } = useDocStore.getState();
  if (!doc) return;

  const clamped = clampPointToDoc(worldPos, doc);
  const hitPaths = doc.nodes.filter(
    (n): n is PathNode =>
      n.type === "path" &&
      n.visible &&
      !n.locked &&
      isPointNearPath(n, clamped, ERASER_RADIUS),
  );

  if (hitPaths.length === 0) return;

  const deleteIds: string[] = [];
  for (const node of hitPaths) {
    if (refs.erasedNodeIdsRef.current.has(node.id)) continue;
    refs.erasedNodeIdsRef.current.add(node.id);
    refs.erasedNodesRef.current.push({ ...node });
    deleteIds.push(node.id);
  }

  if (deleteIds.length > 0) {
    removeNodes(deleteIds);
  }
}

/** commit การลบที่สะสมไว้ให้กลายเป็น history 1 ก้อน */
export function commitEraseHistory(refs: FreehandRefs): void {
  if (refs.erasedNodesRef.current.length === 0) return;

  const op: DeleteOp = {
    type: "delete",
    timestamp: Date.now(),
    nodeIds: refs.erasedNodesRef.current.map((n) => n.id),
    deletedNodes: refs.erasedNodesRef.current,
  };

  useHistoryStore.getState().commit(op);
  refs.erasedNodeIdsRef.current.clear();
  refs.erasedNodesRef.current = [];
}

/** reset สถานะฝั่ง freehand ทั้งหมด */
export function resetFreehandState(refs: FreehandRefs): void {
  refs.isFreehandDrawingRef.current = false;
  refs.currentPathIdRef.current = null;
  refs.currentPathPointsRef.current = [];
  refs.isErasingRef.current = false;
  refs.erasedNodeIdsRef.current.clear();
  refs.erasedNodesRef.current = [];
}
