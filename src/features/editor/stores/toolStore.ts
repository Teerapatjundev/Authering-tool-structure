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
  | "pen"
  | "highlighter"
  | "eraser"
  | "pan";

interface ToolState {
  activeTool: Tool;
  isDrawing: boolean;
  penColor: string;
  penStrokeWidth: number;
  highlighterColor: string;
  highlighterStrokeWidth: number;

  setTool: (tool: Tool) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setPenColor: (color: string) => void;
  setPenStrokeWidth: (width: number) => void;
  setHighlighterColor: (color: string) => void;
  setHighlighterStrokeWidth: (width: number) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: "select",
  isDrawing: false,
  penColor: "#111827",
  penStrokeWidth: 3,
  highlighterColor: "#facc15",
  highlighterStrokeWidth: 16,

  /** เปลี่ยนเครื่องมือ */
  setTool: (tool: Tool) => {
    set({ activeTool: tool });
  },

  /** ตั้งค่าสถานะการวาด */
  setIsDrawing: (isDrawing: boolean) => {
    set({ isDrawing });
  },

  setPenColor: (color: string) => {
    set({ penColor: color });
  },

  setPenStrokeWidth: (width: number) => {
    set({ penStrokeWidth: Math.max(1, Math.min(50, width)) });
  },

  setHighlighterColor: (color: string) => {
    set({ highlighterColor: color });
  },

  setHighlighterStrokeWidth: (width: number) => {
    set({ highlighterStrokeWidth: Math.max(1, Math.min(80, width)) });
  },
}));
