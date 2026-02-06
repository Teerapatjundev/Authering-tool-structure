"use client";

import { useRef, useEffect } from "react";
import { useDocStore } from "../../stores/docStore";
import { useTextEditStore } from "../../stores/textEditStore";
import { editNode } from "../../core/commands/edit";
import { TextNode } from "../../core/doc/types";

export function TextEditOverlay() {
  const { editingNodeId, editingText, updateText, stopEditing } =
    useTextEditStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { doc } = useDocStore();

  useEffect(() => {
    if (editingNodeId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingNodeId]);

  const node = doc?.nodes.find(
    (n) => n.id === editingNodeId && n.type === "text",
  ) as TextNode | undefined;

  if (!editingNodeId || !node) return null;

  const handleSave = () => {
    editNode(node.id, { text: editingText });
    stopEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      stopEditing();
    }
    // Ctrl+Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSave();
    }
    // Allow Enter for new line (default textarea behavior)
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-3">Edit Text</h3>
        <textarea
          ref={textareaRef}
          value={editingText}
          onChange={(e) => updateText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full border border-gray-300 rounded p-3 mb-4 font-mono text-sm resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={8}
          placeholder="Type text here... (press Enter for new line, Ctrl+Enter to save)"
        />
        <div className="text-xs text-gray-600 mb-4 bg-blue-50 p-3 rounded border border-blue-200">
          💡 <strong>Keyboard shortcuts:</strong>
          <br />• <code>Enter</code> for new line
          <br />• <code>Ctrl+Enter</code> or <code>Cmd+Enter</code> to save
          <br />• <code>Esc</code> to cancel
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={stopEditing}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
