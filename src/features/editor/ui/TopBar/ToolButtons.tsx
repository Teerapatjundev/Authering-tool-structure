"use client";

import { useToolStore } from "../../stores/toolStore";
import {
  insertRect,
  insertEllipse,
  insertText,
  insertImage,
  insertVideo,
} from "../../core/commands/insert";
import { useViewStore } from "../../stores/viewStore";

export function ToolButtons() {
  const { activeTool, setTool } = useToolStore();

  const handleInsertRect = () => {
    const { canvasSize } = useViewStore.getState();
    insertRect(canvasSize.width / 2, canvasSize.height / 2);
  };

  const handleInsertEllipse = () => {
    const { canvasSize } = useViewStore.getState();
    insertEllipse(canvasSize.width / 2, canvasSize.height / 2);
  };

  const handleInsertText = () => {
    const { canvasSize } = useViewStore.getState();
    insertText(
      canvasSize.width / 2,
      canvasSize.height / 2,
      "Double-click to edit",
    );
  };

  const handleInsertImage = () => {
    const src = prompt("Enter image URL:");
    if (src) {
      const { canvasSize } = useViewStore.getState();
      insertImage(canvasSize.width / 2, canvasSize.height / 2, src);
    }
  };

  const handleInsertVideo = () => {
    const src = prompt("Enter video URL:");
    if (src) {
      const { canvasSize } = useViewStore.getState();
      insertVideo(canvasSize.width / 2, canvasSize.height / 2, src);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setTool("select")}
        className={`px-3 py-2 rounded ${activeTool === "select" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`}
        title="Select (V)"
      >
        🖱 Select
      </button>

      <button
        onClick={handleInsertRect}
        className="px-3 py-2 rounded hover:bg-gray-100"
        title="Insert Rectangle"
      >
        ▭ Rect
      </button>

      <button
        onClick={handleInsertEllipse}
        className="px-3 py-2 rounded hover:bg-gray-100"
        title="Insert Ellipse"
      >
        ⬭ Ellipse
      </button>

      <button
        onClick={handleInsertText}
        className="px-3 py-2 rounded hover:bg-gray-100"
        title="Insert Text"
      >
        T Text
      </button>

      <button
        onClick={handleInsertImage}
        className="px-3 py-2 rounded hover:bg-gray-100"
        title="Insert Image"
      >
        🖼 Image
      </button>

      <button
        onClick={handleInsertVideo}
        className="px-3 py-2 rounded hover:bg-gray-100"
        title="Insert Video"
      >
        🎬 Video
      </button>
    </div>
  );
}
