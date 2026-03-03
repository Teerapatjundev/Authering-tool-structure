/**
 * ===============================================
 * HIT TESTING
 * ===============================================
 *
 * ฟังก์ชันสำหรับตรวจสอบว่าคลิกโดน node ไหน
 * - hitTestNode: ตรวจสอบว่าจุดอยู่ใน node
 * - findTopNodeAt: หา node บนสุดที่ตำแหน่งนั้น
 */

import { Node, PathNode } from "../doc/types";
import { getNodeBounds, boundsContainsPoint } from "./bounds";

const PATH_HIT_PADDING = 6;

function pointToSegmentDistance(
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
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

function hitTestPath(pathNode: PathNode, x: number, y: number): boolean {
  const left = pathNode.x - pathNode.width / 2;
  const top = pathNode.y - pathNode.height / 2;

  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < pathNode.points.length; i += 2) {
    points.push({
      x: left + pathNode.points[i],
      y: top + pathNode.points[i + 1],
    });
  }

  if (points.length === 0) return false;

  if (points.length === 1) {
    return (
      Math.hypot(x - points[0].x, y - points[0].y) <=
      pathNode.strokeWidth / 2 + PATH_HIT_PADDING
    );
  }

  const threshold = pathNode.strokeWidth / 2 + PATH_HIT_PADDING;
  for (let i = 0; i < points.length - 1; i++) {
    if (pointToSegmentDistance({ x, y }, points[i], points[i + 1]) <= threshold) {
      return true;
    }
  }

  return false;
}

/**
 * ตรวจสอบว่าจุด (x, y) อยู่ใน node หรือไม่
 */
export function hitTestNode(node: Node, x: number, y: number): boolean {
  if (node.type === "path") {
    return hitTestPath(node, x, y);
  }

  const bounds = getNodeBounds(node);
  return boundsContainsPoint(bounds, x, y);
}

/**
 * หา node บนสุดที่ตำแหน่ง (x, y)
 * ค้นหาจาก index สูงสุด (บนสุด) ก่อน
 * ข้าม node ที่ถูกซ่อน (locked node ยังเลือกได้ แต่ขยับ/resize ไม่ได้)
 */
export function findTopNodeAt(
  nodes: Node[],
  x: number,
  y: number,
): Node | null {
  // ค้นหาจากท้าย (บนสุด) ไปหน้า (ล่างสุด)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (!node.visible) continue;
    if (hitTestNode(node, x, y)) {
      return node;
    }
  }
  return null;
}
