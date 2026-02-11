/**
 * ===============================================
 * BOUNDS & GEOMETRY UTILITIES
 * ===============================================
 *
 * ฟังก์ชันสำหรับคำนวณพื้นที่และตำแหน่งของ Node
 * - getNodeBounds: หากรอบพื้นที่ของ node
 * - boundsIntersect: ตรวจสอบว่า 2 พื้นที่ซ้อนทับกัน
 * - boundsContainsPoint: ตรวจสอบว่าจุดอยู่ในพื้นที่
 * - getMultiSelectionBounds: หากรอบพื้นที่รวมของ nodes หลายตัว
 */

import { Node, Bounds } from "../doc/types";

export type { Bounds };

/**
 * หากรอบพื้นที่ของ node (แปลงจาก center-based เป็น top-left)
 * @param node - Node ที่ต้องการหากรอบ
 * @returns Bounds ของ node
 */
export function getNodeBounds(node: Node): Bounds {
  return {
    x: node.x - node.width / 2,
    y: node.y - node.height / 2,
    width: node.width,
    height: node.height,
  };
}

/**
 * ตรวจสอบว่า 2 พื้นที่ซ้อนทับกันหรือไม่
 * ใช้สำหรับ marquee selection (ลากคลุมเลือก)
 */
export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

/**
 * ตรวจสอบว่าจุดอยู่ในพื้นที่หรือไม่
 * ใช้สำหรับ hit testing (คลิกโดน node ไหน)
 */
export function boundsContainsPoint(
  bounds: Bounds,
  x: number,
  y: number,
): boolean {
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  );
}

/**
 * หากรอบพื้นที่รวมของ nodes หลายตัว
 * ใช้สำหรับ multi-selection transform
 */
export function getMultiSelectionBounds(nodes: Node[]): Bounds | null {
  if (nodes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const bounds = getNodeBounds(node);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
