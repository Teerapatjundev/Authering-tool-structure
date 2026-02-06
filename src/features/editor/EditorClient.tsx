"use client";

import { useEffect, useRef } from "react";
import { EditorLayout } from "./EditorLayout";
import { KonvaCanvas } from "./renderer/konva/KonvaCanvas";
import { OverlayRoot } from "./renderer/overlays/OverlayRoot";
import { useDocStore } from "./stores/docStore";
import { useHistoryStore } from "./core/history/historyStore";
import { selectAll, clearSelection } from "./core/commands/selection";
import { deleteSelected, copy, paste, cut } from "./core/commands/clipboard";
import { nudgeSelection } from "./core/commands/transform";

interface EditorClientProps {
  docId: string;
}

export function EditorClient({ docId }: EditorClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { loadDoc } = useDocStore();
  const { undo, redo } = useHistoryStore();

  // Load document on mount
  useEffect(() => {
    loadDoc(docId);
  }, [docId, loadDoc]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Undo/Redo
      if (isCtrlOrCmd && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      if (isCtrlOrCmd && e.key === "y") {
        e.preventDefault();
        redo();
      }

      // Select All
      if (isCtrlOrCmd && e.key === "a") {
        e.preventDefault();
        selectAll();
      }

      // Copy/Cut/Paste
      if (isCtrlOrCmd && e.key === "c") {
        e.preventDefault();
        copy();
      }

      if (isCtrlOrCmd && e.key === "x") {
        e.preventDefault();
        cut();
      }

      if (isCtrlOrCmd && e.key === "v") {
        e.preventDefault();
        paste();
      }

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }

      // Escape - clear selection
      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
      }

      // Arrow keys - nudge
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const amount = e.shiftKey ? 10 : 1;
        switch (e.key) {
          case "ArrowLeft":
            nudgeSelection(-amount, 0);
            break;
          case "ArrowRight":
            nudgeSelection(amount, 0);
            break;
          case "ArrowUp":
            nudgeSelection(0, -amount);
            break;
          case "ArrowDown":
            nudgeSelection(0, amount);
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Get canvas dimensions
  const canvasWidth = containerRef.current?.clientWidth || 800;
  const canvasHeight = containerRef.current?.clientHeight || 600;

  return (
    <EditorLayout>
      <div ref={containerRef} className="w-full h-full relative">
        <KonvaCanvas width={canvasWidth} height={canvasHeight} />
        <OverlayRoot />
      </div>
    </EditorLayout>
  );
}
