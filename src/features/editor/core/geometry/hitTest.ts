/**
 * ===============================================
 * HIT TESTING
 * ===============================================
 *
 * ฟังก์ชันสำหรับตรวจสอบว่าคลิกโดน node ไหน
 * - hitTestNode: ตรวจสอบว่าจุดอยู่ใน node
 * - findTopNodeAt: หา node บนสุดที่ตำแหน่งนั้น
 */

import { Node } from "../doc/types";
import { getNodeBounds, boundsContainsPoint } from "./bounds";

/**
 * ตรวจสอบว่าจุด (x, y) อยู่ใน node หรือไม่
 */
export function hitTestNode(node: Node, x: number, y: number): boolean {
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
