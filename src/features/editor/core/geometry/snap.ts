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

// =============================================
// Equal Spacing Types
// =============================================

export interface SpacingSegment {
  /** จุดเริ่มต้นบนแกนหลัก (x สำหรับ horizontal, y สำหรับ vertical) */
  from: number;
  /** จุดสิ้นสุดบนแกนหลัก */
  to: number;
  /** จุดกึ่งกลางบนแกนตั้งฉาก */
  crossCenter: number;
  /** จุดเริ่มต้นบนแกนตั้งฉาก */
  crossStart: number;
  /** จุดสิ้นสุดบนแกนตั้งฉาก */
  crossEnd: number;
}

export interface EqualSpacingGuide {
  axis: "horizontal" | "vertical";
  /** ค่าระยะห่างที่เท่ากัน */
  gap: number;
  /** ส่วนที่แสดง gap แต่ละช่อง */
  segments: SpacingSegment[];
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
  /** เส้นแสดง equal spacing (padding) */
  spacingGuides: EqualSpacingGuide[];
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
    return { dx, dy, snappedX: false, snappedY: false, guides: [], spacingGuides: [] };
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

  // ----- Equal spacing snap candidates -----
  const staticNodesOnly = allNodes.filter(
    (n) => !movingIds.has(n.id) && n.visible,
  );

  // Horizontal equal spacing
  const sortedStaticByX = [...staticNodesOnly].sort(
    (a, b) => a.x - a.width / 2 - (b.x - b.width / 2),
  );

  for (let i = 0; i < sortedStaticByX.length - 1; i++) {
    const A = sortedStaticByX[i];
    const B = sortedStaticByX[i + 1];

    const aRight = A.x + A.width / 2;
    const aLeft = A.x - A.width / 2;
    const bLeft = B.x - B.width / 2;
    const bRight = B.x + B.width / 2;
    const gap = bLeft - aRight;

    if (gap <= 0) continue;

    const refStart = Math.min(A.y - A.height / 2, B.y - B.height / 2);
    const refEnd = Math.max(A.y + A.height / 2, B.y + B.height / 2);

    // วางทางขวาของ B ระยะห่างเท่ากัน (M.left = bRight + gap)
    xCandidates.push({ value: bRight + gap, refStart, refEnd });
    // วางทางซ้ายของ A ระยะห่างเท่ากัน (M.right = aLeft - gap)
    xCandidates.push({ value: aLeft - gap, refStart, refEnd });
    // วางตรงกลางระหว่าง A กับ B (M.center = midpoint)
    xCandidates.push({ value: (aRight + bLeft) / 2, refStart, refEnd });
  }

  // Vertical equal spacing
  const sortedStaticByY = [...staticNodesOnly].sort(
    (a, b) => a.y - a.height / 2 - (b.y - b.height / 2),
  );

  for (let i = 0; i < sortedStaticByY.length - 1; i++) {
    const A = sortedStaticByY[i];
    const B = sortedStaticByY[i + 1];

    const aBottom = A.y + A.height / 2;
    const aTop = A.y - A.height / 2;
    const bTop = B.y - B.height / 2;
    const bBottom = B.y + B.height / 2;
    const gap = bTop - aBottom;

    if (gap <= 0) continue;

    const refStart = Math.min(A.x - A.width / 2, B.x - B.width / 2);
    const refEnd = Math.max(A.x + A.width / 2, B.x + B.width / 2);

    // วางด้านล่าง B ระยะห่างเท่ากัน
    yCandidates.push({ value: bBottom + gap, refStart, refEnd });
    // วางด้านบน A ระยะห่างเท่ากัน
    yCandidates.push({ value: aTop - gap, refStart, refEnd });
    // วางตรงกลางระหว่าง A กับ B
    yCandidates.push({ value: (aBottom + bTop) / 2, refStart, refEnd });
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

  // ----- ตรวจจับ equal spacing -----
  const finalMovingNodes = movingNodes.map((n) => ({
    ...n,
    x: n.x + finalDx,
    y: n.y + finalDy,
  }));

  const allFinalVisible = [
    ...staticNodesOnly,
    ...finalMovingNodes.filter((n) => n.visible),
  ];

  const spacingGuides = detectEqualSpacing(allFinalVisible, movingIds);

  return {
    dx: finalDx,
    dy: finalDy,
    snappedX: !!bestSnapX,
    snappedY: !!bestSnapY,
    guides,
    spacingGuides,
  };
}

// =============================================
// Equal Spacing Detection
// =============================================

/** ระยะ threshold สำหรับตรวจจับ equal spacing */
const SPACING_THRESHOLD = 3;

/**
 * ตรวจจับเมื่อ nodes 3 ตัวขึ้นไปเรียงกันและมีระยะห่างเท่ากัน
 * @param allNodes - nodes ทั้งหมดที่ตำแหน่งสุดท้าย
 * @param movingIds - IDs ของ nodes ที่กำลังลาก
 */
function detectEqualSpacing(
  allNodes: Node[],
  movingIds: Set<string>,
): EqualSpacingGuide[] {
  const visibleNodes = allNodes.filter((n) => n.visible);
  if (visibleNodes.length < 3) return [];

  const guides: EqualSpacingGuide[] = [];

  // === Horizontal equal spacing ===
  const sortedByX = [...visibleNodes].sort(
    (a, b) => a.x - a.width / 2 - (b.x - b.width / 2),
  );

  for (let start = 0; start < sortedByX.length - 2; start++) {
    const first = sortedByX[start];
    const second = sortedByX[start + 1];

    const firstRight = first.x + first.width / 2;
    const secondLeft = second.x - second.width / 2;
    const refGap = secondLeft - firstRight;

    if (refGap < 1) continue;

    // ขยาย sequence ออกไปเท่าที่ gap เท่ากัน
    let end = start + 1;
    while (end < sortedByX.length - 1) {
      const curr = sortedByX[end];
      const next = sortedByX[end + 1];
      const currRight = curr.x + curr.width / 2;
      const nextLeft = next.x - next.width / 2;
      const gap = nextLeft - currRight;

      if (Math.abs(gap - refGap) <= SPACING_THRESHOLD) {
        end++;
      } else {
        break;
      }
    }

    if (end - start + 1 >= 3) {
      const nodesInSeq = sortedByX.slice(start, end + 1);
      const hasMoving = nodesInSeq.some((n) => movingIds.has(n.id));

      if (hasMoving) {
        const segments: SpacingSegment[] = [];

        for (let i = start; i < end; i++) {
          const left = sortedByX[i];
          const right = sortedByX[i + 1];

          const lRight = left.x + left.width / 2;
          const rLeft = right.x - right.width / 2;

          const lTop = left.y - left.height / 2;
          const lBottom = left.y + left.height / 2;
          const rTop = right.y - right.height / 2;
          const rBottom = right.y + right.height / 2;

          const overlapTop = Math.max(lTop, rTop);
          const overlapBottom = Math.min(lBottom, rBottom);

          let crossCenter: number, crossStart: number, crossEnd: number;
          if (overlapTop < overlapBottom) {
            // มี vertical overlap
            crossCenter = (overlapTop + overlapBottom) / 2;
            crossStart = overlapTop;
            crossEnd = overlapBottom;
          } else {
            // ไม่มี overlap → ใช้ค่าเฉลี่ย
            crossCenter = (left.y + right.y) / 2;
            crossStart = Math.min(lTop, rTop);
            crossEnd = Math.max(lBottom, rBottom);
          }

          segments.push({
            from: lRight,
            to: rLeft,
            crossCenter,
            crossStart,
            crossEnd,
          });
        }

        guides.push({
          axis: "horizontal",
          gap: refGap,
          segments,
        });
      }

      // ข้ามไปที่ท้าย sequence เพื่อไม่ให้ซ้ำ
      start = end - 1;
    }
  }

  // === Vertical equal spacing ===
  const sortedByY = [...visibleNodes].sort(
    (a, b) => a.y - a.height / 2 - (b.y - b.height / 2),
  );

  for (let start = 0; start < sortedByY.length - 2; start++) {
    const first = sortedByY[start];
    const second = sortedByY[start + 1];

    const firstBottom = first.y + first.height / 2;
    const secondTop = second.y - second.height / 2;
    const refGap = secondTop - firstBottom;

    if (refGap < 1) continue;

    let end = start + 1;
    while (end < sortedByY.length - 1) {
      const curr = sortedByY[end];
      const next = sortedByY[end + 1];
      const currBottom = curr.y + curr.height / 2;
      const nextTop = next.y - next.height / 2;
      const gap = nextTop - currBottom;

      if (Math.abs(gap - refGap) <= SPACING_THRESHOLD) {
        end++;
      } else {
        break;
      }
    }

    if (end - start + 1 >= 3) {
      const nodesInSeq = sortedByY.slice(start, end + 1);
      const hasMoving = nodesInSeq.some((n) => movingIds.has(n.id));

      if (hasMoving) {
        const segments: SpacingSegment[] = [];

        for (let i = start; i < end; i++) {
          const top = sortedByY[i];
          const bottom = sortedByY[i + 1];

          const tBottom = top.y + top.height / 2;
          const bTop = bottom.y - bottom.height / 2;

          const tLeft = top.x - top.width / 2;
          const tRight = top.x + top.width / 2;
          const bLeft = bottom.x - bottom.width / 2;
          const bRight = bottom.x + bottom.width / 2;

          const overlapLeft = Math.max(tLeft, bLeft);
          const overlapRight = Math.min(tRight, bRight);

          let crossCenter: number, crossStart: number, crossEnd: number;
          if (overlapLeft < overlapRight) {
            crossCenter = (overlapLeft + overlapRight) / 2;
            crossStart = overlapLeft;
            crossEnd = overlapRight;
          } else {
            crossCenter = (top.x + bottom.x) / 2;
            crossStart = Math.min(tLeft, bLeft);
            crossEnd = Math.max(tRight, bRight);
          }

          segments.push({
            from: tBottom,
            to: bTop,
            crossCenter,
            crossStart,
            crossEnd,
          });
        }

        guides.push({
          axis: "vertical",
          gap: refGap,
          segments,
        });
      }

      start = end - 1;
    }
  }

  return guides;
}

// =============================================
// Size Snap (Resize Snap - Canva-style)
// =============================================

export interface SizeSnapGuide {
  axis: "width" | "height";
  /** ค่า dimension ที่ match (world-space px) */
  value: number;
  /** ขอบเขตของ reference node สำหรับแสดง indicator */
  refNode: { x: number; y: number; width: number; height: number };
}

export interface SizeSnapResult {
  width: number;
  height: number;
  snappedWidth: boolean;
  snappedHeight: boolean;
  sizeGuides: SizeSnapGuide[];
}

const SIZE_SNAP_THRESHOLD = 5;

/**
 * Snap resize dimensions ให้ตรงกับขนาดของ node อื่น (Canva-style)
 * เมื่อ resize แล้วขนาด width/height ใกล้เคียงกับ node อื่น จะ "ดูดติด" ไปที่ขนาดนั้น
 *
 * @param proposedWidth  - ความกว้างที่เสนอ (world-space)
 * @param proposedHeight - ความสูงที่เสนอ (world-space)
 * @param movingNodeIds  - IDs ของ nodes ที่กำลัง resize
 * @param allNodes       - Nodes ทั้งหมด
 * @param threshold      - ระยะ threshold (world-space pixels)
 */
export function snapResizeSize(
  proposedWidth: number,
  proposedHeight: number,
  movingNodeIds: Set<string>,
  allNodes: Node[],
  threshold: number = SIZE_SNAP_THRESHOLD,
): SizeSnapResult {
  let bestWidthMatch: {
    value: number;
    dist: number;
    refNode: Node;
  } | null = null;
  let bestHeightMatch: {
    value: number;
    dist: number;
    refNode: Node;
  } | null = null;

  for (const other of allNodes) {
    if (movingNodeIds.has(other.id) || !other.visible) continue;

    // ตรวจ width match
    const wDist = Math.abs(proposedWidth - other.width);
    if (
      wDist <= threshold &&
      (!bestWidthMatch || wDist < bestWidthMatch.dist)
    ) {
      bestWidthMatch = { value: other.width, dist: wDist, refNode: other };
    }

    // ตรวจ height match
    const hDist = Math.abs(proposedHeight - other.height);
    if (
      hDist <= threshold &&
      (!bestHeightMatch || hDist < bestHeightMatch.dist)
    ) {
      bestHeightMatch = { value: other.height, dist: hDist, refNode: other };
    }
  }

  const sizeGuides: SizeSnapGuide[] = [];

  if (bestWidthMatch) {
    sizeGuides.push({
      axis: "width",
      value: bestWidthMatch.value,
      refNode: {
        x: bestWidthMatch.refNode.x,
        y: bestWidthMatch.refNode.y,
        width: bestWidthMatch.refNode.width,
        height: bestWidthMatch.refNode.height,
      },
    });
  }

  if (bestHeightMatch) {
    sizeGuides.push({
      axis: "height",
      value: bestHeightMatch.value,
      refNode: {
        x: bestHeightMatch.refNode.x,
        y: bestHeightMatch.refNode.y,
        width: bestHeightMatch.refNode.width,
        height: bestHeightMatch.refNode.height,
      },
    });
  }

  return {
    width: bestWidthMatch ? bestWidthMatch.value : proposedWidth,
    height: bestHeightMatch ? bestHeightMatch.value : proposedHeight,
    snappedWidth: !!bestWidthMatch,
    snappedHeight: !!bestHeightMatch,
    sizeGuides,
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
