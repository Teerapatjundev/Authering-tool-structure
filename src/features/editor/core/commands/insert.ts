/**
 * ===============================================
 * INSERT COMMANDS - คำสั่งเพิ่ม Node
 * ===============================================
 *
 * คำสั่งสำหรับเพิ่ม nodes ใหม่ลงใน canvas:
 * - insertRect: เพิ่มสี่เหลี่ยม
 * - insertEllipse: เพิ่มวงรี
 * - insertText: เพิ่มข้อความ
 * - insertTextLink: เพิ่มลิงก์ข้อความ
 * - insertImage: เพิ่มรูปภาพ
 * - insertVideo: เพิ่มวิดีโอ
 */

import {
  RectNode,
  EllipseNode,
  TextNode,
  ImageNode,
  VideoNode,
} from "../doc/types";
import { generateNodeId } from "@/shared/utils/id";
import { useHistoryStore } from "../history/historyStore";
import { InsertOp } from "../history/ops";

/**
 * เพิ่มสี่เหลี่ยมลงใน canvas
 * @param x - ตำแหน่ง X (กึ่งกลาง)
 * @param y - ตำแหน่ง Y (กึ่งกลาง)
 * @param width - ความกว้าง
 * @param height - ความสูง
 */
export function insertRect(
  x: number,
  y: number,
  width = 100,
  height = 100,
): void {
  const node: RectNode = {
    id: generateNodeId(),
    type: "rect",
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: "#3b82f6", // น้ำเงิน
    stroke: "#1e40af", // ขอบน้ำเงินเข้ม
    strokeWidth: 2,
    cornerRadius: 0,
  };

  commitInsert([node]);
}

/**
 * เพิ่มวงรีลงใน canvas
 */
export function insertEllipse(
  x: number,
  y: number,
  width = 100,
  height = 100,
): void {
  const node: EllipseNode = {
    id: generateNodeId(),
    type: "ellipse",
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: "#10b981", // เขียว
    stroke: "#059669", // ขอบเขียวเข้ม
    strokeWidth: 2,
  };

  commitInsert([node]);
}

/**
 * เพิ่มข้อความลงใน canvas
 */
export function insertText(x: number, y: number, text = "Text"): void {
  const node: TextNode = {
    id: generateNodeId(),
    type: "text",
    x,
    y,
    width: 200,
    height: 50,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    text,
    fontSize: 24,
    fontFamily: "Arial",
    fill: "#000000",
    fontStyle: "normal",
    align: "left",
  };

  commitInsert([node]);
}

/**
 * เพิ่มลิงก์ข้อความลงใน canvas
 */
export function insertTextLink(
  x: number,
  y: number,
  url = "https://example.com",
): void {
  const node: TextNode = {
    id: generateNodeId(),
    type: "text",
    x,
    y,
    width: 280,
    height: 40,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    text: url,
    fontSize: 20,
    fontFamily: "Arial",
    fill: "#2563eb",
    fontStyle: "normal",
    align: "left",
  };

  commitInsert([node]);
}

/**
 * เพิ่มรูปภาพลงใน canvas
 * @param src - URL ของรูปภาพ
 */
export function insertImage(
  x: number,
  y: number,
  src: string,
  width = 200,
  height = 200,
): void {
  const node: ImageNode = {
    id: generateNodeId(),
    type: "image",
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    src,
  };

  commitInsert([node]);
}

/**
 * เพิ่มวิดีโอลงใน canvas
 * @param src - URL ของวิดีโอ
 */
export function insertVideo(
  x: number,
  y: number,
  src: string,
  width = 400,
  height = 300,
): void {
  const node: VideoNode = {
    id: generateNodeId(),
    type: "video",
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    src,
  };

  commitInsert([node]);
}

/**
 * เพิ่มการ์ดแบบฝึกหัดลงใน canvas (เป็นกลุ่ม)
 * - พื้นหลังการ์ด (rect)
 * - กล่องสี่เหลี่ยมด้านบน (rect)
 * - title (text)
 * - description (text)
 */
export function insertPracticeCard(
  x: number,
  y: number,
  title: string,
  description: string,
): void {
  const cardW = 220;
  const cardH = 240;

  const padding = 14;
  const squareW = cardW - padding * 2;
  const squareY = y - cardH / 2 + padding + squareW / 2;

  const titleY = squareY + squareW / 2 + 14;
  const descY = titleY + 22;

  const groupId = generateNodeId();

  const card: RectNode = {
    id: generateNodeId(),
    type: "rect",
    x,
    y,
    width: cardW,
    height: cardH,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    groupId,
    fill: "#ffffff",
    stroke: "#e5e7eb",
    strokeWidth: 2,
    cornerRadius: 10,
  };

  const square: RectNode = {
    id: generateNodeId(),
    type: "rect",
    x,
    y: squareY,
    width: squareW,
    height: squareW,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    groupId,
    fill: "#e5e7eb",
    stroke: "#d1d5db",
    strokeWidth: 1,
    cornerRadius: 4,
  };

  const titleNode: TextNode = {
    id: generateNodeId(),
    type: "text",
    x,
    y: titleY,
    width: cardW - padding * 2,
    height: 40,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    groupId,
    text: title,
    fontSize: 16,
    fontFamily: "Arial",
    fill: "#111827",
    fontStyle: "bold",
    align: "center",
  };

  const descNode: TextNode = {
    id: generateNodeId(),
    type: "text",
    x,
    y: descY,
    width: cardW - padding * 2,
    height: 40,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    groupId,
    text: description,
    fontSize: 12,
    fontFamily: "Arial",
    fill: "#6b7280",
    fontStyle: "normal",
    align: "center",
  };

  commitInsert([card, square, titleNode, descNode]);
}

// ===============================================
// HELPER FUNCTION
// ===============================================

/** Commit insert operation ไปยัง history */
function commitInsert(
  nodes: (RectNode | EllipseNode | TextNode | ImageNode | VideoNode)[],
): void {
  const op: InsertOp = {
    type: "insert",
    timestamp: Date.now(),
    nodes,
  };
  useHistoryStore.getState().commit(op);
}
