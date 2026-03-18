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
export type NodeType =
  | "rect"
  | "ellipse"
  | "triangle"
  | "pentagon"
  | "text"
  | "image"
  | "video"
  | "audio"
  | "path";

// ===============================================
// PRACTICE METADATA (สำหรับ viewer ในอนาคต)
// ===============================================

export type ConnectionSide = "left" | "right";

/**
 * เก็บ metadata ของแบบฝึกหัดไว้กับ node โดยไม่กระทบการ render ของ node type เดิม
 * - `id` คือ id อ้างอิงร่วมของชุดแบบฝึกหัด (เช่น connection 1 ชุด = 2 nodes ที่มี practice.id เดียวกัน)
 */
export interface PracticeMeta {
  type: string; // เช่น "connection"
  id: string; // id อ้างอิงของชุดแบบฝึกหัด
  side?: ConnectionSide; // ใช้กับ connection (left/right)
  itemId?: string; // ใช้กับ connection/choice ในกรณีที่ต้องอ้างอิง item แบบ stable
  title?: string;
  description?: string;

  // === Answer reveal behavior ===
  revealMode?: "after-item" | "other";

  // === Container semantics (Parent/Child) ===
  containerRole?: "primary" | "sub";

  // === Choice (คำถามแบบเลือก) ===
  mode?: "single" | "multiple";
  totalOptions?: number;
  correctCount?: number;
  optionIndex?: number; // 0-based
  isCorrect?: boolean;

  // === Connection (โยงเส้นจับคู่) ===
  connectionPairs?: Array<{ leftItemId: string; rightItemId: string }>;
}

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

  // === Practice ===
  practice?: PracticeMeta;

  // === Grouping ===
  groupId?: string; // รหัสกลุ่ม (ถ้าอยู่ในกลุ่ม)
  groupRotation?: number; // มุมหมุนสะสมของกลุ่ม (Canva-style: กรอบเอียงตาม)

  // === Parent / Child ===
  parentId?: string; // ถ้าเป็น child จะชี้ไปยัง parent node

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

// สามเหลี่ยม
export interface TriangleNode extends BaseNode {
  type: "triangle";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

// ห้าเหลี่ยม
export interface PentagonNode extends BaseNode {
  type: "pentagon";
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
  fontStyle?: "normal" | "bold" | "italic" | "bold italic";
  underline?: boolean;
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

// เสียง
export interface AudioNode extends BaseNode {
  type: "audio";
  src: string; // URL ของไฟล์เสียง
  name?: string; // ชื่อไฟล์ (ถ้ามี)
}

// เส้นวาดอิสระ (pen/highlighter)
export interface PathNode extends BaseNode {
  type: "path";
  points: number[]; // จุดแบบ relative ภายในกรอบ [x1,y1,x2,y2,...]
  stroke: string;
  strokeWidth: number;
  mode: "pen" | "highlighter";
}

// รวม Node ทุกประเภท
export type Node =
  | RectNode
  | EllipseNode
  | TriangleNode
  | PentagonNode
  | TextNode
  | ImageNode
  | VideoNode
  | AudioNode
  | PathNode;

// ===============================================
// PAGE - หน้าของเอกสาร (canvas แยกอิสระ)
// ===============================================
export interface Page {
  id: string;
  title?: string;
  nodes: Node[];
  width: number; // ความกว้าง canvas ของหน้านี้
  height: number; // ความสูง canvas ของหน้านี้
  backgroundColor: string;
}

// ===============================================
// DOCUMENT - เอกสารที่เก็บข้อมูลทั้งหมด (หลายหน้า)
// ===============================================
export interface Document {
  id: string;
  title: string;
  version: number;
  pages: Page[];
  activePageId: string;
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
