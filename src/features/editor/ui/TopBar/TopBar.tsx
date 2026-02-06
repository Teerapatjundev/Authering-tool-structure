"use client";

import { ToolButtons } from "./ToolButtons";
import { ZoomControls } from "./ZoomControls";
import { useDocStore } from "../../stores/docStore";
import { useHistoryStore } from "../../core/history/historyStore";
import {
  alignLeft,
  alignCenter,
  alignRight,
  alignTop,
  alignMiddle,
  alignBottom,
} from "../../core/commands/arrange";
import { deleteSelected } from "../../core/commands/clipboard";
import { useRouter } from "next/navigation";

export function TopBar() {
  const router = useRouter();
  const { doc, setDocTitle } = useDocStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-blue-600 font-bold text-xl hover:text-blue-700"
        >
          Canvas Editor
        </button>

        <input
          type="text"
          value={doc?.title || ""}
          onChange={(e) => setDocTitle(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          placeholder="Untitled"
        />
      </div>

      {/* Center: Tools */}
      <div className="flex items-center gap-2">
        <ToolButtons />

        <div className="h-8 w-px bg-gray-300 mx-2" />

        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="px-3 py-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="px-3 py-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Shift+Z)"
        >
          ↷ Redo
        </button>

        <div className="h-8 w-px bg-gray-300 mx-2" />

        {/* Alignment */}
        <button
          onClick={alignLeft}
          className="px-2 py-2 rounded hover:bg-gray-100"
          title="Align Left"
        >
          ⬅
        </button>
        <button
          onClick={alignCenter}
          className="px-2 py-2 rounded hover:bg-gray-100"
          title="Align Center"
        >
          ↔
        </button>
        <button
          onClick={alignRight}
          className="px-2 py-2 rounded hover:bg-gray-100"
          title="Align Right"
        >
          ➡
        </button>
        <button
          onClick={alignTop}
          className="px-2 py-2 rounded hover:bg-gray-100"
          title="Align Top"
        >
          ⬆
        </button>
        <button
          onClick={alignMiddle}
          className="px-2 py-2 rounded hover:bg-gray-100"
          title="Align Middle"
        >
          ↕
        </button>
        <button
          onClick={alignBottom}
          className="px-2 py-2 rounded hover:bg-gray-100"
          title="Align Bottom"
        >
          ⬇
        </button>

        <div className="h-8 w-px bg-gray-300 mx-2" />

        {/* Delete */}
        <button
          onClick={deleteSelected}
          className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          title="Delete (Del)"
        >
          🗑 Delete
        </button>
      </div>

      {/* Right: Zoom */}
      <ZoomControls />
    </div>
  );
}
