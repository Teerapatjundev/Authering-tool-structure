"use client";

import { useDocStore } from "../../stores/docStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { bringToFront, sendToBack } from "../../core/commands/arrange";

export function LayersPanel() {
  const { doc } = useDocStore();
  const { selectedIds, select } = useSelectionStore();

  if (!doc) return null;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Layers</h3>
        <div className="flex gap-1">
          <button
            onClick={bringToFront}
            className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
            title="Bring to Front"
          >
            ⬆
          </button>
          <button
            onClick={sendToBack}
            className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
            title="Send to Back"
          >
            ⬇
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {/* Render in reverse order (top to bottom) */}
        {[...doc.nodes].reverse().map((node) => (
          <div
            key={node.id}
            onClick={() => select(node.id)}
            className={`px-3 py-2 rounded cursor-pointer text-sm ${
              selectedIds.has(node.id)
                ? "bg-blue-100 text-blue-700 font-medium"
                : "hover:bg-gray-100"
            }`}
          >
            <span className="capitalize">{node.type}</span>
            {node.name && (
              <span className="text-gray-500 ml-2">({node.name})</span>
            )}
          </div>
        ))}
      </div>

      {doc.nodes.length === 0 && (
        <p className="text-sm text-gray-500 text-center mt-8">No layers yet</p>
      )}
    </div>
  );
}
