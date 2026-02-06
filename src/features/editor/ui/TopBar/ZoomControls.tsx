"use client";

import { useViewStore } from "../../stores/viewStore";
import { clampZoom } from "@/shared/utils/clamp";

export function ZoomControls() {
  const { viewport, setZoom, resetView } = useViewStore();

  const handleZoomIn = () => {
    setZoom(clampZoom(viewport.zoom * 1.2));
  };

  const handleZoomOut = () => {
    setZoom(clampZoom(viewport.zoom / 1.2));
  };

  const handleResetZoom = () => {
    resetView();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleZoomOut}
        className="px-3 py-2 rounded hover:bg-gray-100"
        title="Zoom Out"
      >
        −
      </button>

      <span className="text-sm font-medium min-w-[60px] text-center">
        {Math.round(viewport.zoom * 100)}%
      </span>

      <button
        onClick={handleZoomIn}
        className="px-3 py-2 rounded hover:bg-gray-100"
        title="Zoom In"
      >
        +
      </button>

      <button
        onClick={handleResetZoom}
        className="px-3 py-2 rounded hover:bg-gray-100"
        title="Reset View"
      >
        Reset
      </button>
    </div>
  );
}
