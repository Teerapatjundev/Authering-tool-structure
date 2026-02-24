/**
 * ===============================================
 * SNAP - การจัดตำแหน่งอัตโนมัติ (Smart Guides)
 * ===============================================
 *
 * Snap node เข้ากับ:
 * 1. กึ่งกลาง Canvas (แนวนอน + แนวตั้ง)
 * 2. ขอบ + กึ่งกลาง ของ Nodes อื่น
 *    - ซ้าย / กลาง / ขวา  (แนวตั้ง)
 *    - บน  / กลาง / ล่าง  (แนวนอน)
 *
 * เมื่อลากวัตถุเข้าใกล้เส้น snap ≤ SNAP_THRESHOLD px
 * จะ "ดูดติด" ไปที่ตำแหน่งนั้นพร้อมแสดง guide line
 */

import { Node } from "../doc/types";

/** ระยะที่จะเริ่ม snap (world-space pixels) */
const SNAP_THRESHOLD = 8;

// =============================================
// Types
// =============================================

export interface SnapGuideInfo {
  type: "vertical" | "horizontal";
  /** ตำแหน่งเส้น (world coord) */
  position: number;
  /** จุดเริ่ม-จุดจบ เพื่อวาดเส้นให้ครอบคลุมวัตถุที่เกี่ยวข้อง */
  start: number;
  end: number;
}

export interface SnapResult {
  /** dx ที่ปรับ snap แล้ว */
  dx: number;
  /** dy ที่ปรับ snap แล้ว */
  dy: number;
  snappedX: boolean;
  snappedY: boolean;
  /** เส้น guides ที่ต้องแสดง */
  guides: SnapGuideInfo[];
}

// =============================================
// Helpers
// =============================================

/** จุด snap 5 จุดของ node: left, centerX, right, top, centerY, bottom */
function getSnapPoints(node: Node) {
  const halfW = node.width / 2;
  const halfH = node.height / 2;
  return {
    left: node.x - halfW,
    centerX: node.x,
    right: node.x + halfW,
    top: node.y - halfH,
    centerY: node.y,
    bottom: node.y + halfH,
  };
}

/** หาค่า snap ที่ใกล้ที่สุดจาก candidates */
function findClosest(
  target: number,
  candidates: Array<{ value: number; refStart: number; refEnd: number }>,
  threshold: number,
): { value: number; dist: number; refStart: number; refEnd: number } | null {
  let best: {
    value: number;
    dist: number;
    refStart: number;
    refEnd: number;
  } | null = null;
  for (const c of candidates) {
    const dist = Math.abs(target - c.value);
    if (dist < threshold && (!best || dist < best.dist)) {
      best = { value: c.value, dist, refStart: c.refStart, refEnd: c.refEnd };
    }
  }
  return best;
}

// =============================================
// Main
// =============================================

/**
 * คำนวณ snap สำหรับกลุ่ม nodes ที่กำลังลาก
 *
 * @param movingNodes - Nodes ที่กำลังลาก
 * @param allNodes    - Nodes ทั้งหมด (ไม่รวม movingNodes)
 * @param dx          - delta X ก่อน snap
 * @param dy          - delta Y ก่อน snap
 * @param canvasWidth - ความกว้าง canvas
 * @param canvasHeight- ความสูง canvas
 */
export function snapNodes(
  movingNodes: Node[],
  allNodes: Node[],
  dx: number,
  dy: number,
  canvasWidth: number,
  canvasHeight: number,
): SnapResult {
  if (movingNodes.length === 0) {
    return { dx, dy, snappedX: false, snappedY: false, guides: [] };
  }

  const movingIds = new Set(movingNodes.map((n) => n.id));

  // ----- สร้าง snap-lines จาก canvas center + ขอบ canvas -----
  const xCandidates: Array<{
    value: number;
    refStart: number;
    refEnd: number;
  }> = [
    // Canvas center แนวตั้ง
    { value: canvasWidth / 2, refStart: 0, refEnd: canvasHeight },
    // ขอบซ้าย-ขวา canvas
    { value: 0, refStart: 0, refEnd: canvasHeight },
    { value: canvasWidth, refStart: 0, refEnd: canvasHeight },
  ];

  const yCandidates: Array<{
    value: number;
    refStart: number;
    refEnd: number;
  }> = [
    // Canvas center แนวนอน
    { value: canvasHeight / 2, refStart: 0, refEnd: canvasWidth },
    // ขอบบน-ล่าง canvas
    { value: 0, refStart: 0, refEnd: canvasWidth },
    { value: canvasHeight, refStart: 0, refEnd: canvasWidth },
  ];

  // ----- สร้าง snap-lines จาก nodes อื่น -----
  for (const other of allNodes) {
    if (movingIds.has(other.id) || !other.visible) continue;

    const sp = getSnapPoints(other);

    // แนวตั้ง (X): ขอบซ้าย, กลาง, ขอบขวา ของ other
    xCandidates.push(
      { value: sp.left, refStart: sp.top, refEnd: sp.bottom },
      { value: sp.centerX, refStart: sp.top, refEnd: sp.bottom },
      { value: sp.right, refStart: sp.top, refEnd: sp.bottom },
    );

    // แนวนอน (Y): ขอบบน, กลาง, ขอบล่าง ของ other
    yCandidates.push(
      { value: sp.top, refStart: sp.left, refEnd: sp.right },
      { value: sp.centerY, refStart: sp.left, refEnd: sp.right },
      { value: sp.bottom, refStart: sp.left, refEnd: sp.right },
    );
  }

  // ----- ทดสอบ snap กับทุก moving node -----
  let bestSnapX: {
    correction: number;
    dist: number;
    guidePos: number;
    guideStart: number;
    guideEnd: number;
    nodeStart: number;
    nodeEnd: number;
  } | null = null;

  let bestSnapY: {
    correction: number;
    dist: number;
    guidePos: number;
    guideStart: number;
    guideEnd: number;
    nodeStart: number;
    nodeEnd: number;
  } | null = null;

  for (const node of movingNodes) {
    const futureX = node.x + dx;
    const futureY = node.y + dy;
    const halfW = node.width / 2;
    const halfH = node.height / 2;

    // 3 จุดของ node ที่จะ snap ในแกน X
    const nodeXPoints = [
      futureX - halfW, // ขอบซ้าย
      futureX, // กึ่งกลาง
      futureX + halfW, // ขอบขวา
    ];

    // 3 จุดของ node ที่จะ snap ในแกน Y
    const nodeYPoints = [
      futureY - halfH, // ขอบบน
      futureY, // กึ่งกลาง
      futureY + halfH, // ขอบล่าง
    ];

    const nodeTop = futureY - halfH;
    const nodeBottom = futureY + halfH;
    const nodeLeft = futureX - halfW;
    const nodeRight = futureX + halfW;

    // หา snap X ที่ดีที่สุด
    for (const px of nodeXPoints) {
      const match = findClosest(px, xCandidates, SNAP_THRESHOLD);
      if (match && (!bestSnapX || match.dist < bestSnapX.dist)) {
        bestSnapX = {
          correction: match.value - px,
          dist: match.dist,
          guidePos: match.value,
          guideStart: match.refStart,
          guideEnd: match.refEnd,
          nodeStart: nodeTop,
          nodeEnd: nodeBottom,
        };
      }
    }

    // หา snap Y ที่ดีที่สุด
    for (const py of nodeYPoints) {
      const match = findClosest(py, yCandidates, SNAP_THRESHOLD);
      if (match && (!bestSnapY || match.dist < bestSnapY.dist)) {
        bestSnapY = {
          correction: match.value - py,
          dist: match.dist,
          guidePos: match.value,
          guideStart: match.refStart,
          guideEnd: match.refEnd,
          nodeStart: nodeLeft,
          nodeEnd: nodeRight,
        };
      }
    }
  }

  // ----- สร้างผลลัพธ์ -----
  const guides: SnapGuideInfo[] = [];
  let finalDx = dx;
  let finalDy = dy;

  if (bestSnapX) {
    finalDx = dx + bestSnapX.correction;
    guides.push({
      type: "vertical",
      position: bestSnapX.guidePos,
      start: Math.min(bestSnapX.guideStart, bestSnapX.nodeStart) - 20,
      end: Math.max(bestSnapX.guideEnd, bestSnapX.nodeEnd) + 20,
    });
  }

  if (bestSnapY) {
    finalDy = dy + bestSnapY.correction;
    guides.push({
      type: "horizontal",
      position: bestSnapY.guidePos,
      start: Math.min(bestSnapY.guideStart, bestSnapY.nodeStart) - 20,
      end: Math.max(bestSnapY.guideEnd, bestSnapY.nodeEnd) + 20,
    });
  }

  return {
    dx: finalDx,
    dy: finalDy,
    snappedX: !!bestSnapX,
    snappedY: !!bestSnapY,
    guides,
  };
}

/**
 * (Legacy) snapNode - เรียก snapNodes ภายใน สำหรับ backward-compat
 */
export function snapNode(
  node: Node,
  allNodes: Node[],
  dragDelta: { x: number; y: number },
): { x: number; y: number; snappedX: boolean; snappedY: boolean } {
  const result = snapNodes(
    [node],
    allNodes,
    dragDelta.x,
    dragDelta.y,
    9999,
    9999,
  );
  return {
    x: node.x + result.dx,
    y: node.y + result.dy,
    snappedX: result.snappedX,
    snappedY: result.snappedY,
  };
}
