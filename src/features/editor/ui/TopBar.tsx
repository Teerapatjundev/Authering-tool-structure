/**
 * ===============================================
 * TOP BAR - แถบด้านบน
 * ===============================================
 *
 * แสดง:
 * - Logo และชื่อ Document
 * - Pan/Select toggle
 * - Undo/Redo buttons
 * - Zoom controls
 */

"use client";

import { useDocStore } from "../stores/docStore";
import { useViewStore } from "../stores/viewStore";
import { useToolStore } from "../stores/toolStore";
import { useHistoryStore } from "../core/history/historyStore";

export function TopBar() {
  const { doc } = useDocStore();
  const { viewport, setZoom } = useViewStore();
  const { activeTool, setTool } = useToolStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  const handleZoomIn = () => setZoom(viewport.zoom + 0.25);
  const handleZoomOut = () => setZoom(viewport.zoom - 0.25);
  const handleZoomReset = () => setZoom(1);

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 shadow-sm">
      {/* ซ้าย: Logo & Document Title */}
      <div className="flex items-center gap-4">
        <div className="font-bold text-xl text-blue-600">Canvas</div>
        <div className="h-6 w-px bg-gray-300" />
        <h1 className="font-medium text-gray-700 max-w-[200px] truncate">
          {doc?.title || "Untitled"}
        </h1>
      </div>

      {/* กลาง: Tools + Undo/Redo */}
      <div className="flex items-center gap-4">
        {/* Select / Pan toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTool("select")}
            className={`w-9 h-9 rounded-md flex items-center justify-center transition-all ${
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
            className={`w-9 h-9 rounded-md flex items-center justify-center transition-all ${
              activeTool === "pan"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-transparent text-gray-600 hover:bg-gray-200"
            }`}
            title="Pan Tool (H) - Drag to move canvas"
          >
            ✋
          </button>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className={`w-9 h-9 rounded-md flex items-center justify-center transition-all ${
              canUndo()
                ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                : "bg-gray-50 text-gray-300 cursor-not-allowed"
            }`}
            title="Undo (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className={`w-9 h-9 rounded-md flex items-center justify-center transition-all ${
              canRedo()
                ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                : "bg-gray-50 text-gray-300 cursor-not-allowed"
            }`}
            title="Redo (Ctrl+Y)"
          >
            ↷
          </button>
        </div>
      </div>

      {/* ขวา: Zoom Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={handleZoomReset}
          className="px-3 h-8 rounded-md bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 min-w-[60px]"
          title="Reset Zoom"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"
          title="Zoom In"
        >
          +
        </button>
      </div>
    </header>
  );
}
