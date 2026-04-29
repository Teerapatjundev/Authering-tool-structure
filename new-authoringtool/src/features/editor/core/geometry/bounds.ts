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

function getRegularPolygonVertices(
  sides: number,
  width: number,
  height: number,
): Array<{ x: number; y: number }> {
  // base polygon with radius=50 in local space (center at 0,0)
  const base: Array<{ x: number; y: number }> = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < sides; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / sides;
    const x = Math.cos(angle) * 50;
    const y = Math.sin(angle) * 50;
    base.push({ x, y });
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const baseW = Math.max(1, maxX - minX);
  const baseH = Math.max(1, maxY - minY);
  const sx = width / baseW;
  const sy = height / baseH;

  return base.map((p) => ({ x: p.x * sx, y: p.y * sy }));
}

function getPolygonBounds(node: Node, sides: 3 | 5): Bounds {
  const points = getRegularPolygonVertices(sides, node.width, node.height);
  const rad = ((node.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    const wx = p.x * cos - p.y * sin + node.x;
    const wy = p.x * sin + p.y * cos + node.y;
    minX = Math.min(minX, wx);
    minY = Math.min(minY, wy);
    maxX = Math.max(maxX, wx);
    maxY = Math.max(maxY, wy);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * หากรอบพื้นที่ของ node (แปลงจาก center-based เป็น top-left)
 * @param node - Node ที่ต้องการหากรอบ
 * @returns Bounds ของ node
 */
export function getNodeBounds(node: Node): Bounds {
  if (node.type === "triangle") return getPolygonBounds(node, 3);
  if (node.type === "pentagon") return getPolygonBounds(node, 5);

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

/**
 * หากรอบพื้นที่ของ node โดยคำนึงถึง rotation
 * คำนวณ AABB (axis-aligned bounding box) จากมุมทั้ง 4 ที่หมุนแล้ว
 * @param node - Node ที่ต้องการหากรอบ
 * @returns Bounds ที่ครอบ node ที่หมุนแล้วทั้งหมด
 */
export function getRotatedNodeBounds(node: Node): Bounds {
  if (node.type === "triangle") return getPolygonBounds(node, 3);
  if (node.type === "pentagon") return getPolygonBounds(node, 5);

  const hw = node.width / 2;
  const hh = node.height / 2;

  // ไม่มี rotation → ใช้ getNodeBounds ปกติ
  if (!node.rotation || node.rotation % 360 === 0) {
    return getNodeBounds(node);
  }

  const rad = (node.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // 4 มุมของ rectangle (relative to center)
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const c of corners) {
    // หมุนมุมแล้วแปลงเป็น world coordinates
    const rx = c.x * cos - c.y * sin + node.x;
    const ry = c.x * sin + c.y * cos + node.y;
    minX = Math.min(minX, rx);
    minY = Math.min(minY, ry);
    maxX = Math.max(maxX, rx);
    maxY = Math.max(maxY, ry);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * หากรอบพื้นที่รวมของ nodes หลายตัว โดยคำนึงถึง rotation ของแต่ละ node
 * ใช้สำหรับ multi-selection proxy rect ที่ต้องครอบ nodes ที่หมุนแล้ว
 */
export function getMultiSelectionBoundsWithRotation(
  nodes: Node[],
): Bounds | null {
  if (nodes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const bounds = getRotatedNodeBounds(node);
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

/**
 * คำนวณ bounding box ของ nodes ใน rotated frame (เหมือน Canva)
 * ใช้สำหรับ proxy rect ที่มี group rotation สะสม
 * กรอบจะเอียงตาม groupRotation แทนที่จะเป็น axis-aligned
 *
 * @param nodes - Nodes ที่ต้องการหากรอบ
 * @param groupRotation - มุมหมุนสะสมของ group (องศา)
 * @returns { centerX, centerY, width, height } ใน world space
 */
export function getGroupBoundsInRotatedFrame(
  nodes: Node[],
  groupRotation: number,
): { centerX: number; centerY: number; width: number; height: number } | null {
  if (nodes.length === 0) return null;

  // ไม่มี group rotation → ใช้ AABB ปกติ
  if (!groupRotation || groupRotation % 360 === 0) {
    const b = getMultiSelectionBoundsWithRotation(nodes);
    if (!b) return null;
    return {
      centerX: b.x + b.width / 2,
      centerY: b.y + b.height / 2,
      width: b.width,
      height: b.height,
    };
  }

  // Unrotate ทุก corner ของทุก node ด้วย -groupRotation
  // แล้วหา AABB ใน unrotated space → นั่นคือขนาดของ proxy rect
  const rad = (-groupRotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const node of nodes) {
    const hw = node.width / 2;
    const hh = node.height / 2;
    const nodeRad = ((node.rotation || 0) * Math.PI) / 180;
    const nc = Math.cos(nodeRad);
    const ns = Math.sin(nodeRad);

    // 4 มุมของ node (considering node's own rotation)
    const corners = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];

    for (const c of corners) {
      // Node rotation → world space
      const wx = c.x * nc - c.y * ns + node.x;
      const wy = c.x * ns + c.y * nc + node.y;
      // Unrotate by group rotation
      const rx = wx * cos - wy * sin;
      const ry = wx * sin + wy * cos;

      minX = Math.min(minX, rx);
      minY = Math.min(minY, ry);
      maxX = Math.max(maxX, rx);
      maxY = Math.max(maxY, ry);
    }
  }

  // Center ใน unrotated space → rotate กลับเป็น world space
  const ucx = (minX + maxX) / 2;
  const ucy = (minY + maxY) / 2;

  const backRad = (groupRotation * Math.PI) / 180;
  const bc = Math.cos(backRad);
  const bs = Math.sin(backRad);

  return {
    centerX: ucx * bc - ucy * bs,
    centerY: ucx * bs + ucy * bc,
    width: maxX - minX,
    height: maxY - minY,
  };
}
