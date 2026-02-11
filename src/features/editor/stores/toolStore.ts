/**
 * ===============================================
 * TOOL STORE - จัดการเครื่องมือที่เลือก
 * ===============================================
 *
 * เก็บสถานะเครื่องมือที่ active:
 * - select: เลือก/ลาก nodes
 * - rect: วาดสี่เหลี่ยม
 * - ellipse: วาดวงรี
 * - text: เพิ่มข้อความ
 * - pan: เลื่อน canvas
 */

import { create } from "zustand";

// เครื่องมือที่รองรับ
export type Tool =
  | "select"
  | "rect"
  | "ellipse"
  | "text"
  | "image"
  | "video"
  | "pan";

interface ToolState {
  activeTool: Tool;
  isDrawing: boolean;

  setTool: (tool: Tool) => void;
  setIsDrawing: (isDrawing: boolean) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: "select",
  isDrawing: false,

  /** เปลี่ยนเครื่องมือ */
  setTool: (tool: Tool) => {
    set({ activeTool: tool });
  },

  /** ตั้งค่าสถานะการวาด */
  setIsDrawing: (isDrawing: boolean) => {
    set({ isDrawing });
  },
}));
