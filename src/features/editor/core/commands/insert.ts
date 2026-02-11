/**
 * ===============================================
 * INSERT COMMANDS - คำสั่งเพิ่ม Node
 * ===============================================
 *
 * คำสั่งสำหรับเพิ่ม nodes ใหม่ลงใน canvas:
 * - insertRect: เพิ่มสี่เหลี่ยม
 * - insertEllipse: เพิ่มวงรี
 * - insertText: เพิ่มข้อความ
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
