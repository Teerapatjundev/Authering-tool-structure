import { create } from "zustand";

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

  // Actions
  setTool: (tool: Tool) => void;
  setIsDrawing: (isDrawing: boolean) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: "select",
  isDrawing: false,

  setTool: (tool: Tool) => {
    set({ activeTool: tool });
  },

  setIsDrawing: (isDrawing: boolean) => {
    set({ isDrawing });
  },
}));
