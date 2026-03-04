/**
 * ===============================================
 * POLYGON GEOMETRY - Utility สำหรับรูปทรงหลายเหลี่ยม
 * ===============================================
 *
 * หน้าที่ของไฟล์นี้:
 * - คำนวณขนาดกรอบจริง (axis-aligned bounding box) ของ RegularPolygon
 * - ใช้เป็นฐานในการ map ระหว่าง node.width/node.height กับ Konva scale
 * - ทำให้การ render และ transform ของ polygon มีสัดส่วนตรงกัน
 *
 * เหตุผลที่ต้องมี utility นี้:
 * - RegularPolygon ของ Konva ไม่ได้มีกรอบฐานเป็น 100x100 เสมอ
 * - ถ้าใช้ scale แบบ hardcode จะเกิดอาการขอบล่องหน/resize เพี้ยนหลังหมุน
 * - การคำนวณจากจุดยอดจริงช่วยให้ behavior ตรงกับกรอบ transform มากขึ้น
 *
 * การใช้งาน:
 * - TRI_BASE_SIZE: ขนาดฐานของสามเหลี่ยม (radius 50)
 * - PENT_BASE_SIZE: ขนาดฐานของห้าเหลี่ยม (radius 50)
 * - นำค่าไปคำนวณ scaleX/scaleY ใน RenderNodes และ SelectionController
 */

export function getRegularPolygonBaseSize(sides: number, radius = 50) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < sides; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / sides;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return { width: maxX - minX, height: maxY - minY };
}

export const TRI_BASE_SIZE = getRegularPolygonBaseSize(3, 50);
export const PENT_BASE_SIZE = getRegularPolygonBaseSize(5, 50);
