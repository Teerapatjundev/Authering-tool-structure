/**
 * ===============================================
 * SNAP - การจัดตำแหน่งอัตโนมัติ
 * ===============================================
 *
 * ฟังก์ชันสำหรับ snap node เข้ากับ node อื่น
 * เมื่อลาก node ใกล้กับ node อื่น จะ snap เข้าหากัน
 */

import { Node } from "../doc/types";

const SNAP_THRESHOLD = 8; // ระยะที่จะเริ่ม snap (pixels)

export interface SnapResult {
  x: number; // ตำแหน่ง X ที่ snap แล้ว
  y: number; // ตำแหน่ง Y ที่ snap แล้ว
  snappedX: boolean; // snap ในแนว X หรือไม่
  snappedY: boolean; // snap ในแนว Y หรือไม่
}

/**
 * คำนวณตำแหน่ง snap ของ node
 * @param node - Node ที่กำลังลาก
 * @param allNodes - Nodes ทั้งหมดใน canvas
 * @param dragDelta - ระยะที่ลากไป (dx, dy)
 * @returns ตำแหน่งที่ snap แล้ว
 */
export function snapNode(
  node: Node,
  allNodes: Node[],
  dragDelta: { x: number; y: number },
): SnapResult {
  const targetX = node.x + dragDelta.x;
  const targetY = node.y + dragDelta.y;

  let snappedX = targetX;
  let snappedY = targetY;
  let didSnapX = false;
  let didSnapY = false;

  // Snap center-to-center กับ node อื่น
  for (const other of allNodes) {
    if (other.id === node.id || !other.visible) continue;

    // Snap แกน X (แนวตั้ง)
    if (!didSnapX && Math.abs(targetX - other.x) < SNAP_THRESHOLD) {
      snappedX = other.x;
      didSnapX = true;
    }

    // Snap แกน Y (แนวนอน)
    if (!didSnapY && Math.abs(targetY - other.y) < SNAP_THRESHOLD) {
      snappedY = other.y;
      didSnapY = true;
    }

    if (didSnapX && didSnapY) break;
  }

  return {
    x: snappedX,
    y: snappedY,
    snappedX: didSnapX,
    snappedY: didSnapY,
  };
}
