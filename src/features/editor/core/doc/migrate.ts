/**
 * ===============================================
 * DOCUMENT UTILITIES
 * ===============================================
 *
 * ฟังก์ชันสำหรับจัดการเอกสาร
 * - createEmptyDocument: สร้างเอกสารเปล่า
 * - migrateDocument: อัพเกรดเอกสารเก่า (ถ้ามี)
 *
 * ขนาด A4 Landscape:
 * - 297mm x 210mm
 * - ที่ 96 DPI = 1123 x 794 pixels (ประมาณ)
 */

import { Document } from "./types";

// A4 Landscape dimensions at 96 DPI
export const A4_LANDSCAPE_WIDTH = 1123;
export const A4_LANDSCAPE_HEIGHT = 794;

/**
 * สร้างเอกสารเปล่าใหม่
 * @param id - รหัสเอกสาร
 * @param title - ชื่อเอกสาร
 * @returns Document ใหม่ที่ว่างเปล่า
 */
export function createEmptyDocument(id: string, title = "Untitled"): Document {
  const firstPageId = `page_${id}_1`;
  return {
    id,
    title,
    version: 1,
    pages: [
      {
        id: firstPageId,
        title: "Page 1",
        nodes: [],
        width: A4_LANDSCAPE_WIDTH,
        height: A4_LANDSCAPE_HEIGHT,
        backgroundColor: "#ffffff",
      },
    ],
    activePageId: firstPageId,
    updatedAt: Date.now(),
  };
}

/**
 * อัพเกรดเอกสารเวอร์ชันเก่า (สำหรับอนาคต)
 * @param doc - เอกสารที่ต้องการ migrate
 * @returns Document ที่อัพเกรดแล้ว
 */
export function migrateDocument(doc: unknown): Document {
  return doc as Document;
}
