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
import { Button } from "../../../components/ui/button";

export function FloatingToolbar() {
  const { activeTool, setTool } = useToolStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 px-1.5 py-1">
      {/* Select / Pan toggle */}
      <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5">
        <Button
          onClick={() => setTool("select")}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-all text-xs ${
            activeTool === "select"
              ? "bg-blue-500 text-white shadow-md"
              : "bg-transparent text-gray-600 hover:bg-gray-200"
          }`}
          title="Select Tool (V)"
        >
          ↖
        </Button>
        <Button
          onClick={() => setTool("pan")}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-all text-xs ${
            activeTool === "pan"
              ? "bg-blue-500 text-white shadow-md"
              : "bg-transparent text-gray-600 hover:bg-gray-200"
          }`}
          title="Pan Tool (H) - Drag to move canvas"
        >
          ✋
        </Button>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-gray-300" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <Button
          onClick={undo}
          disabled={!canUndo()}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-all text-xs ${
            canUndo()
              ? "hover:bg-blue-500 text-white"
              : "text-gray-300 cursor-not-allowed"
          }`}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </Button>
        <Button
          onClick={redo}
          disabled={!canRedo()}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-all text-xs ${
            canRedo()
              ? "hover:bg-blue-500 text-white"
              : "text-gray-300 cursor-not-allowed"
          }`}
          title="Redo (Ctrl+Y)"
        >
    
          ↷
        </Button>
      </div>
    </div>
  );
}
