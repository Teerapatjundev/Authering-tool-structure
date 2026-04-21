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
 * - insertTriangle: เพิ่มสามเหลี่ยม
 * - insertPentagon: เพิ่มห้าเหลี่ยม
 */

import {
  Node,
  RectNode,
  EllipseNode,
  TriangleNode,
  PentagonNode,
  TextNode,
  TextLinkNode,
  ImageNode,
  VideoNode,
  AudioNode,
} from "../doc/types";
import { generateNodeId } from "@/shared/utils/id";
import { useHistoryStore } from "../history/historyStore";
import { InsertOp } from "../history/ops";
import { useDocStore } from "../../stores/docStore";

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
  const node: TextLinkNode = {
    id: generateNodeId(),
    type: "textlink",
    x,
    y,
    width: 280,
    height: 40,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    text: url,
    url,
    fontSize: 20,
    fontFamily: "Arial",
    fill: "#2563eb",
    fontStyle: "normal",
    align: "left",
    underline: true,
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
 * เพิ่มไฟล์เสียงลงใน canvas
 * @param src - URL ของไฟล์เสียง
 */
export function insertAudio(
  x: number,
  y: number,
  src: string,
  name?: string,
  width = 320,
  height = 80,
): void {
  const node: AudioNode = {
    id: generateNodeId(),
    type: "audio",
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    src,
    name,
  };

  commitInsert([node]);
}

/**
 * เพิ่มสามเหลี่ยมลงใน canvas
 */
export function insertTriangle(
  x: number,
  y: number,
  width = 140,
  height = 120,
): void {
  const node: TriangleNode = {
    id: generateNodeId(),
    type: "triangle",
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: "#3b82f6",
    stroke: "#1e40af",
    strokeWidth: 2,
  };

  commitInsert([node]);
}

/**
 * เพิ่มห้าเหลี่ยมลงใน canvas
 */
export function insertPentagon(
  x: number,
  y: number,
  width = 140,
  height = 140,
): void {
  const node: PentagonNode = {
    id: generateNodeId(),
    type: "pentagon",
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: "#8b5cf6",
    stroke: "#6d28d9",
    strokeWidth: 2,
  };

  commitInsert([node]);
}

/**  */
export function insertAccordion(x: number, y: number): void {
  
}

/**
 * เพิ่มปุ่ม Next button ลงใน canvas
 * - ปุ่มพื้นหลังสีแดง
 * - ข้อความ "ถัดไป" สีขาว
 */
export function insertNextButton(x: number, y: number): void {
  const buttonW = 220;
  const buttonH = 64;
  const groupId = generateNodeId();
  const practiceId = generateNodeId();

  const practiceMeta = {
    type: "next-button",
    id: practiceId,
    title: "Next button",
    description: "ปุ่มถัดไป",
    nextButtonAction: "next-page" as const,
  };

  const buttonShape: RectNode = {
    id: generateNodeId(),
    type: "rect",
    x,
    y,
    width: buttonW,
    height: buttonH,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    groupId,
    practice: practiceMeta,
    fill: "#F41221",
    stroke: "#F41221",
    strokeWidth: 0,
    cornerRadius: 14,
  };

  const buttonLabel: TextNode = {
    id: generateNodeId(),
    type: "text",
    x,
    y,
    width: buttonW,
    height: buttonH,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    groupId,
    practice: practiceMeta,
    text: "ถัดไป",
    fontSize: 30,
    fontFamily: "Arial",
    fill: "#FFFFFF",
    fontStyle: "bold",
    align: "center",
  };

  commitInsert([buttonShape, buttonLabel]);
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
  practiceType: string,
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
  const practiceId = generateNodeId();

  const practiceMeta = {
    type: practiceType,
    id: practiceId,
    title,
    description,
  };

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
    practice: practiceMeta,
    fill: "#ffffff",
    stroke: "#C7C8D1",
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
    practice: practiceMeta,
    fill: "#e5e7eb",
    stroke: "#C7C8D1",
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
    practice: practiceMeta,
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
    practice: practiceMeta,
    text: description,
    fontSize: 12,
    fontFamily: "Arial",
    fill: "#6b7280",
    fontStyle: "normal",
    align: "center",
  };

  commitInsert([card, square, titleNode, descNode]);
}

/**
 * เพิ่มแบบฝึกหัด Connection (โยงเส้นจับคู่)
 * - สร้าง 2 nodes (ซ้าย/ขวา)
 * - ทั้งสอง nodes จะมี `practice.id` เดียวกันเพื่ออ้างอิงว่าเป็นชุดเดียวกัน
 * หมายเหตุ: ห้ามใช้ node.id ซ้ำกัน เพราะจะทำให้ selection, update, React key พัง
 */
export function insertConnectionPair(
  x: number,
  y: number,
  title: string,
  description: string,
): void {
  // Default size for Connection practice nodes
  const cardW = 150;
  const cardH = 48;
  const gap = 200;

  // Parent boundary (similar to Choice primary container)
  const containerPaddingX = 24;
  const containerPaddingY = 24;
  const containerW = cardW * 2 + gap + containerPaddingX * 2;
  const containerH = cardH + containerPaddingY * 2;

  const setId = generateNodeId();
  const primaryId = generateNodeId();

  const leftItemId = generateNodeId();
  const rightItemId = generateNodeId();

  const leftX = x - (cardW / 2 + gap / 2);
  const rightX = x + (cardW / 2 + gap / 2);

  const practicePrimary = {
    type: "connection" as const,
    id: setId,
    title,
    description,
    containerRole: "primary" as const,
    connectionPairs: [{ leftItemId, rightItemId }],
  };

  const primary: RectNode = {
    id: primaryId,
    type: "rect",
    x,
    y,
    width: containerW,
    height: containerH,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    practice: practicePrimary,
    fill: "rgba(0,0,0,0)",
    stroke: "#C7C8D1",
    strokeWidth: 2,
    cornerRadius: 12,
  };

  const baseProps = {
    type: "rect" as const,
    width: cardW,
    height: cardH,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    parentId: primaryId,
    fill: "#ffffff",
    stroke: "#C7C8D1",
    strokeWidth: 2,
    cornerRadius: 10,
    practice: {
      type: "connection",
      id: setId,
      title,
      description,
      containerRole: "sub" as const,
      itemId: leftItemId,
    },
  };

  const left: RectNode = {
    id: generateNodeId(),
    x: leftX,
    y,
    ...baseProps,
    practice: { ...baseProps.practice, side: "left", itemId: leftItemId },
  };

  const right: RectNode = {
    id: generateNodeId(),
    x: rightX,
    y,
    ...baseProps,
    practice: { ...baseProps.practice, side: "right", itemId: rightItemId },
  };

  commitInsert([primary, left, right]);
}

/**
 * เพิ่มแบบฝึกหัด Fill in the blank (เติมคำลงในช่องว่าง)
 * - การ์ดพื้นหลัง (rect)
 * - ข้อความคำถาม (text)
 * - กล่องคำตอบ (rect)
 * - label placeholder (text)
 */
export function insertFillInTheBlank(
  x: number,
  y: number,
  title: string,
  description: string,
): void {
  const cardW = 240;
  const cardH = 130;
  const padding = 16;
  const groupId = generateNodeId();
  const setId = generateNodeId();

  const practiceMeta = {
    type: "fill-in-the-blank",
    id: setId,
    title,
    description,
    fillInTheBlankAnswer: "",
    fillInTheBlankScore: 1,
  };

  const questionY = y - cardH / 2 + padding + 12;
  const inputW = cardW - padding * 2;
  const inputH = 36;
  const inputY = questionY + 24 + inputH / 2 + 10;

  // กรอบ input
  const inputBox: RectNode = {
    id: generateNodeId(),
    type: "rect",
    x,
    y: inputY,
    width: inputW,
    height: inputH,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    groupId,
    practice: practiceMeta,
    fill: "#ffffff",
    stroke: "#d1d5db",
    strokeWidth: 1.5,
    cornerRadius: 6,
  };

  // Placeholder text ใน input
  const inputLabel: TextNode = {
    id: generateNodeId(),
    type: "text",
    x,
    y: inputY,
    width: inputW,
    height: inputH,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    groupId,
    practice: practiceMeta,
    text: "คำตอบ",
    fontSize: 14,
    fontFamily: "Arial",
    fill: "#9ca3af",
    fontStyle: "normal",
    align: "left",
  };

  commitInsert([inputBox, inputLabel]);
}

/**
 * เพิ่มแบบฝึกหัด Choice (คำถามแบบเลือก) เป็นชุดของ option nodes
 * - สร้าง nodes ตามจำนวนตัวเลือกทั้งหมด
 * - กำหนดว่า option ไหนเป็น "ตัวเลือกที่ถูก" / "ตัวเลือกหลอก" ผ่าน metadata
 */
export function insertChoiceOptions(
  x: number,
  y: number,
  mode: "single" | "multiple",
  totalOptions: number,
  correctCount: number,
  title?: string,
  description?: string,
): void {
  // Option cards are half-size compared to practice card (per requirement)
  const cardW = 110;
  const cardH = 120;
  const gapX = 12;

  const optionPadding = 7;
  const squareW = cardW - optionPadding * 2;

  const n = Math.max(1, Math.floor(totalOptions));
  const c =
    mode === "single" ? 1 : Math.max(1, Math.min(Math.floor(correctCount), n));

  const setId = generateNodeId();
  const primaryId = generateNodeId();

  // Primary container uses drop point as top-left.
  const containerPadding = 14;
  const optionsWidth = n * cardW + Math.max(0, n - 1) * gapX;
  const containerW = optionsWidth + containerPadding * 2;
  const containerH = cardH + containerPadding * 2;
  const containerCx = x + containerW / 2;
  const containerCy = y + containerH / 2;

  const practiceMetaPrimary = {
    type: "choice" as const,
    id: setId,
    mode,
    totalOptions: n,
    correctCount: c,
    title,
    description,
    containerRole: "primary" as const,
  };

  const primary: RectNode = {
    id: primaryId,
    type: "rect",
    x: containerCx,
    y: containerCy,
    width: containerW,
    height: containerH,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    practice: practiceMetaPrimary,
    fill: "#ffffff",
    stroke: "#C7C8D1",
    strokeWidth: 2,
    cornerRadius: 12,
  };

  const startX = x + containerPadding + cardW / 2;
  const baseY = y + containerPadding + cardH / 2;

  const nodes: (RectNode | TextNode)[] = [primary];

  for (let i = 0; i < n; i++) {
    const cardX = startX + i * (cardW + gapX);
    const cardY = baseY;
    const squareY = cardY - cardH / 2 + optionPadding + squareW / 2;
    const titleY = squareY + squareW / 2 + 8;
    const descY = titleY + 16;

    const isCorrect = i < c;
    const optionGroupId = generateNodeId();

    const practiceMeta = {
      type: "choice" as const,
      id: setId,
      mode,
      totalOptions: n,
      correctCount: c,
      optionIndex: i,
      isCorrect,
      title,
      description,
      containerRole: "sub" as const,
    };

    const card: RectNode = {
      id: generateNodeId(),
      type: "rect",
      x: cardX,
      y: cardY,
      width: cardW,
      height: cardH,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      parentId: primaryId,
      groupId: optionGroupId,
      practice: practiceMeta,
      fill: "#ffffff",
      stroke: "#C7C8D1",
      strokeWidth: 2,
      cornerRadius: 10,
    };

    const square: RectNode = {
      id: generateNodeId(),
      type: "rect",
      x: cardX,
      y: squareY,
      width: squareW,
      height: squareW,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      parentId: primaryId,
      groupId: optionGroupId,
      practice: practiceMeta,
      fill: "#e5e7eb",
      stroke: "#C7C8D1",
      strokeWidth: 1,
      cornerRadius: 4,
    };

    const titleNode: TextNode = {
      id: generateNodeId(),
      type: "text",
      x: cardX,
      y: titleY,
      width: cardW - optionPadding * 2,
      height: 24,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      parentId: primaryId,
      groupId: optionGroupId,
      practice: practiceMeta,
      text: `ตัวเลือก ${i + 1}`,
      fontSize: 12,
      fontFamily: "Arial",
      fill: "#111827",
      fontStyle: "bold",
      align: "center",
    };

    const descNode: TextNode = {
      id: generateNodeId(),
      type: "text",
      x: cardX,
      y: descY,
      width: cardW - optionPadding * 2,
      height: 24,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      parentId: primaryId,
      groupId: optionGroupId,
      practice: practiceMeta,
      text: isCorrect ? "ตัวเลือกที่ถูก" : "ตัวเลือกหลอก",
      fontSize: 10,
      fontFamily: "Arial",
      fill: "#6b7280",
      fontStyle: "normal",
      align: "center",
    };

    nodes.push(card, square, titleNode, descNode);
  }

  commitInsert(nodes);
}

/**
 * เพิ่มแบบฝึกหัด Sequence/Ordering เป็นชุดของ option nodes (คล้าย Choice แต่ไม่มีตั้งค่าเฉลย)
 * - สร้าง primary container + child cards ตามจำนวนที่ระบุ
 * - แสดงเลขลำดับบน card เพื่อแยกออกว่าเป็น Sequence/Ordering
 */
export function insertSequenceOrderingOptions(
  x: number,
  y: number,
  totalOptions: number,
  title?: string,
  description?: string,
): void {
  // Keep visuals consistent with Choice option cards.
  const cardW = 110;
  const cardH = 120;
  const gapX = 12;

  const optionPadding = 7;
  const squareW = cardW - optionPadding * 2;

  const n = Math.max(1, Math.floor(totalOptions));

  const setId = generateNodeId();
  const primaryId = generateNodeId();

  // Primary container uses drop point as top-left.
  const containerPadding = 14;
  const optionsWidth = n * cardW + Math.max(0, n - 1) * gapX;
  const containerW = optionsWidth + containerPadding * 2;
  const containerH = cardH + containerPadding * 2;
  const containerCx = x + containerW / 2;
  const containerCy = y + containerH / 2;

  const practiceMetaPrimary = {
    type: "sequence-ordering" as const,
    id: setId,
    totalOptions: n,
    title,
    description,
    containerRole: "primary" as const,
  };

  const primary: RectNode = {
    id: primaryId,
    type: "rect",
    x: containerCx,
    y: containerCy,
    width: containerW,
    height: containerH,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    practice: practiceMetaPrimary,
    fill: "#ffffff",
    stroke: "#C7C8D1",
    strokeWidth: 2,
    cornerRadius: 12,
  };

  const startX = x + containerPadding + cardW / 2;
  const baseY = y + containerPadding + cardH / 2;

  const nodes: (RectNode | TextNode)[] = [primary];

  for (let i = 0; i < n; i++) {
    const cardX = startX + i * (cardW + gapX);
    const cardY = baseY;
    const squareY = cardY - cardH / 2 + optionPadding + squareW / 2;
    const titleY = squareY + squareW / 2 + 8;
    const descY = titleY + 16;

    const optionGroupId = generateNodeId();

    const practiceMeta = {
      type: "sequence-ordering" as const,
      id: setId,
      totalOptions: n,
      optionIndex: i,
      title,
      description,
      containerRole: "sub" as const,
    };

    const card: RectNode = {
      id: generateNodeId(),
      type: "rect",
      x: cardX,
      y: cardY,
      width: cardW,
      height: cardH,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      parentId: primaryId,
      groupId: optionGroupId,
      practice: practiceMeta,
      fill: "#ffffff",
      stroke: "#C7C8D1",
      strokeWidth: 2,
      cornerRadius: 10,
    };

    const square: RectNode = {
      id: generateNodeId(),
      type: "rect",
      x: cardX,
      y: squareY,
      width: squareW,
      height: squareW,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      parentId: primaryId,
      groupId: optionGroupId,
      practice: practiceMeta,
      fill: "#e5e7eb",
      stroke: "#C7C8D1",
      strokeWidth: 1,
      cornerRadius: 4,
    };

    const orderNode: TextNode = {
      id: generateNodeId(),
      type: "text",
      x: cardX,
      y: squareY,
      width: squareW,
      height: squareW,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      parentId: primaryId,
      groupId: optionGroupId,
      practice: practiceMeta,
      text: String(i + 1),
      fontSize: 28,
      fontFamily: "Arial",
      fill: "#111827",
      fontStyle: "bold",
      align: "center",
    };

    const titleNode: TextNode = {
      id: generateNodeId(),
      type: "text",
      x: cardX,
      y: titleY,
      width: cardW - optionPadding * 2,
      height: 24,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      parentId: primaryId,
      groupId: optionGroupId,
      practice: practiceMeta,
      text: `ลำดับ ${i + 1}`,
      fontSize: 12,
      fontFamily: "Arial",
      fill: "#111827",
      fontStyle: "bold",
      align: "center",
    };

    const descNode: TextNode = {
      id: generateNodeId(),
      type: "text",
      x: cardX,
      y: descY,
      width: cardW - optionPadding * 2,
      height: 24,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      parentId: primaryId,
      groupId: optionGroupId,
      practice: practiceMeta,
      text: "",
      fontSize: 10,
      fontFamily: "Arial",
      fill: "#6b7280",
      fontStyle: "normal",
      align: "center",
    };

    nodes.push(card, square, orderNode, titleNode, descNode);
  }

  commitInsert(nodes);
}

// ===============================================
// HELPER FUNCTION
// ===============================================

/** Commit insert operation ไปยัง history */
function commitInsert(nodes: Node[]): void {
  const { doc } = useDocStore.getState();
  if (!doc) return;
  const op: InsertOp = {
    type: "insert",
    timestamp: Date.now(),
    pageId: doc.activePageId,
    nodes,
  };
  useHistoryStore.getState().commit(op);
}
