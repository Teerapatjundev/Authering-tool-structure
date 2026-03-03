/**
 * ===============================================
 * TOP BAR - แถบด้านบน
 * ===============================================
 *
 * แสดง:
 * - Logo และชื่อ Document
 * - Zoom controls
 *
 * หมายเหตุ: Select/Pan toggle และ Undo/Redo
 * ถูกย้ายไปอยู่ใน FloatingToolbar แล้ว
 */

"use client";

import { useDocStore } from "../stores/docStore";
import { useViewStore } from "../stores/viewStore";

export function TopBar() {
  const { doc } = useDocStore();
  const { viewport, setZoom } = useViewStore();

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
