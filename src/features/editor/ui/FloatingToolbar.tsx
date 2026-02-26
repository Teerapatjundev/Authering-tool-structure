/**
 * ===============================================
 * FLOATING TOOLBAR - แถบเครื่องมือลอย
 * ===============================================
 *
 * Toolbar ลอยกลางด้านบนของ Canvas แสดง:
 * - Select / Pan tool toggle
 * - Undo / Redo buttons
 *
 * แยกออกจาก TopBar เพื่อให้ลอยเหนือ canvas
 * โดยไม่ผูกกับ layout ของ header
 */

"use client";

import { useToolStore } from "../stores/toolStore";
import { useHistoryStore } from "../core/history/historyStore";

export function FloatingToolbar() {
  const { activeTool, setTool } = useToolStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 px-2 py-1.5">
      {/* Select / Pan toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => setTool("select")}
          className={`w-9 h-9 rounded-md flex items-center justify-center transition-all text-sm ${
            activeTool === "select"
              ? "bg-blue-500 text-white shadow-md"
              : "bg-transparent text-gray-600 hover:bg-gray-200"
          }`}
          title="Select Tool (V)"
        >
          ↖
        </button>
        <button
          onClick={() => setTool("pan")}
          className={`w-9 h-9 rounded-md flex items-center justify-center transition-all text-sm ${
            activeTool === "pan"
              ? "bg-blue-500 text-white shadow-md"
              : "bg-transparent text-gray-600 hover:bg-gray-200"
          }`}
          title="Pan Tool (H) - Drag to move canvas"
        >
          ✋
        </button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className={`w-9 h-9 rounded-md flex items-center justify-center transition-all text-sm ${
            canUndo()
              ? "hover:bg-gray-100 text-gray-700"
              : "text-gray-300 cursor-not-allowed"
          }`}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className={`w-9 h-9 rounded-md flex items-center justify-center transition-all text-sm ${
            canRedo()
              ? "hover:bg-gray-100 text-gray-700"
              : "text-gray-300 cursor-not-allowed"
          }`}
          title="Redo (Ctrl+Y)"
        >
          ↷
        </button>
      </div>
    </div>
  );
}
