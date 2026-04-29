/**
 * ===============================================
 * ID UTILITIES - สร้างรหัสเฉพาะ
 * ===============================================
 *
 * ฟังก์ชันสำหรับสร้าง unique IDs
 */

import { nanoid } from "nanoid";

/** สร้าง ID ทั่วไป */
export function generateId(): string {
  return nanoid();
}

/** สร้าง ID สำหรับ Node (มี prefix "node_") */
export function generateNodeId(): string {
  return `node_${nanoid(10)}`;
}
