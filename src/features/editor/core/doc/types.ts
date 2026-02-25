/**
 * ===============================================
 * CANVAS EDITOR - TYPE DEFINITIONS
 * ===============================================
 *
 * โครงสร้างข้อมูลหลักของ Canvas Editor
 * - Node: วัตถุต่างๆ บน canvas (rect, ellipse, text, image, video)
 * - Document: เอกสารที่เก็บ nodes ทั้งหมด
 * - Viewport: ตำแหน่งและ zoom ของมุมมอง
 * - Bounds: กรอบพื้นที่ (x, y, width, height)
 *
 * หมายเหตุ: Node ใช้ CENTER-based coordinates
 * (x, y คือตำแหน่งกึ่งกลางของ node)
 */

// ประเภทของ Node ที่รองรับ
export type NodeType = "rect" | "ellipse" | "text" | "image" | "video";

// ===============================================
// BASE NODE - คุณสมบัติพื้นฐานที่ทุก Node มี
// ===============================================
export interface BaseNode {
  id: string; // รหัสเฉพาะของ node
  type: NodeType; // ประเภทของ node
  x: number; // ตำแหน่ง X (กึ่งกลาง)
  y: number; // ตำแหน่ง Y (กึ่งกลาง)
  width: number; // ความกว้าง
  height: number; // ความสูง
  rotation: number; // มุมหมุน (องศา)
  opacity: number; // ความโปร่งใส (0-1)
  locked: boolean; // ล็อคไม่ให้แก้ไข
  visible: boolean; // แสดง/ซ่อน

  // === Grouping ===
  groupId?: string; // รหัสกลุ่ม (ถ้าอยู่ในกลุ่ม)
  groupRotation?: number; // มุมหมุนสะสมของกลุ่ม (Canva-style: กรอบเอียงตาม)

  // === Master / Instance ===
  masterId?: string; // ชี้ไปยัง master node (ถ้าเป็น instance)
  isMaster?: boolean; // เป็น master template หรือไม่
}

// ===============================================
// NODE TYPES - ประเภทต่างๆ ของ Node
// ===============================================

// สี่เหลี่ยม
export interface RectNode extends BaseNode {
  type: "rect";
  fill: string; // สีพื้น
  stroke?: string; // สีขอบ
  strokeWidth?: number; // ความหนาขอบ
  cornerRadius?: number; // ความโค้งมุม
}

// วงรี
export interface EllipseNode extends BaseNode {
  type: "ellipse";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

// ข้อความ
export interface TextNode extends BaseNode {
  type: "text";
  text: string; // เนื้อหาข้อความ
  fontSize: number; // ขนาดตัวอักษร
  fontFamily: string; // ฟอนต์
  fill: string; // สีตัวอักษร
  fontStyle?: "normal" | "bold" | "italic";
  align?: "left" | "center" | "right";
}

// รูปภาพ
export interface ImageNode extends BaseNode {
  type: "image";
  src: string; // URL ของรูปภาพ
}

// วิดีโอ
export interface VideoNode extends BaseNode {
  type: "video";
  src: string; // URL ของวิดีโอ
}

// รวม Node ทุกประเภท
export type Node = RectNode | EllipseNode | TextNode | ImageNode | VideoNode;

// ===============================================
// DOCUMENT - เอกสารที่เก็บข้อมูลทั้งหมด
// ===============================================
export interface Document {
  id: string;
  title: string;
  version: number;
  nodes: Node[];
  width: number; // ความกว้าง canvas
  height: number; // ความสูง canvas
  backgroundColor: string;
  updatedAt: number;
}

// ===============================================
// VIEWPORT - มุมมอง (pan & zoom)
// ===============================================
export interface Viewport {
  x: number; // offset X (pan)
  y: number; // offset Y (pan)
  zoom: number; // ระดับ zoom
}

// ===============================================
// BOUNDS - กรอบพื้นที่
// ===============================================
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
