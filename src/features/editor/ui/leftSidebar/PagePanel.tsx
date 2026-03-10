"use client";

import { useState } from "react";
import { Stage, Layer, Rect, Group } from "react-konva";
import { useDocStore } from "@/features/editor/stores/docStore";
import { RenderNodes } from "@/features/editor/renderer/konva/RenderNodes";
import type { Page } from "@/features/editor/core/doc/types";

const PREVIEW_WIDTH = 232; // 256 (w-64) - 24 (p-3)

function InsertPageButton({ insertIndex }: { insertIndex: number }) {
  const insertPageAt = useDocStore((s) => s.insertPageAt);

  return (
    <button
      type="button"
      onClick={() => insertPageAt(insertIndex)}
      className="flex items-center justify-center w-full py-1"
      aria-label="Add page"
    >
      <div className="flex items-center justify-center text-gray-700 bg-white border border-gray-300 rounded-full w-7 h-7 hover:bg-gray-50">
        +
      </div>
    </button>
  );
}

function PagePreview({ page, index }: { page: Page; index: number }) {
  const doc = useDocStore((s) => s.doc);
  const setActivePage = useDocStore((s) => s.setActivePage);
  const isActive = !!doc && doc.activePageId === page.id;

  const scale = PREVIEW_WIDTH / page.width;
  const previewHeight = Math.max(1, Math.round(page.height * scale));

  return (
    <div className="w-full">
      <div className="mb-1 text-xs text-gray-600">Page {index + 1}</div>
      <button
        type="button"
        onClick={() => setActivePage(page.id)}
        className={
          "w-full overflow-hidden rounded-md bg-gray-50 border text-left " +
          (isActive ? "border-blue-300" : "border-gray-200")
        }
      >
        <Stage
          width={PREVIEW_WIDTH}
          height={previewHeight}
          scaleX={scale}
          scaleY={scale}
          listening={false}
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              width={page.width}
              height={page.height}
              fill={page.backgroundColor || "#ffffff"}
            />

            {/* Clip เฉพาะพื้นที่ของหน้านี้ */}
            <Group
              clipFunc={(ctx) => {
                ctx.rect(0, 0, page.width, page.height);
              }}
            >
              <RenderNodes nodes={page.nodes || []} />
            </Group>
          </Layer>
        </Stage>
      </button>
    </div>
  );
}

export function PagePanel() {
  const doc = useDocStore((s) => s.doc);
  const movePageToIndex = useDocStore((s) => s.movePageToIndex);

  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<
    | {
        pageId: string;
        placement: "above" | "below";
      }
    | null
  >(null);

  if (!doc) {
    return (
      <div className="flex-1 p-3 overflow-auto">
        <div className="p-3 text-sm text-gray-600 border border-gray-200 rounded-md bg-gray-50">
          Loading...
        </div>
      </div>
    );
  }

  const pages = doc.pages || [];

  return (
    <div className="flex-1 p-3 overflow-auto">
      <div className="flex flex-col gap-3">
        <InsertPageButton insertIndex={0} />
        {pages.map((page, i) => {
          const isDragging = draggingPageId === page.id;
          const isDragOver = dragOver?.pageId === page.id;
          const overPlacement = isDragOver ? dragOver?.placement : null;

          return (
            <div key={page.id} className="flex flex-col gap-3">
              <div
                draggable
                onDragStart={(e) => {
                  setDraggingPageId(page.id);
                  setDragOver(null);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("application/x-editor-page-id", page.id);
                  e.dataTransfer.setData("text/plain", page.id);
                }}
                onDragEnd={() => {
                  setDraggingPageId(null);
                  setDragOver(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  const rect = e.currentTarget.getBoundingClientRect();
                  const placement =
                    e.clientY - rect.top > rect.height / 2 ? "below" : "above";
                  setDragOver({ pageId: page.id, placement });
                }}
                onDragLeave={() => {
                  setDragOver((curr) => (curr?.pageId === page.id ? null : curr));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedId =
                    e.dataTransfer.getData("application/x-editor-page-id") ||
                    e.dataTransfer.getData("text/plain");
                  if (!draggedId) return;

                  const rect = e.currentTarget.getBoundingClientRect();
                  const placement =
                    e.clientY - rect.top > rect.height / 2 ? "below" : "above";
                  const targetIndex = i + (placement === "below" ? 1 : 0);

                  movePageToIndex(draggedId, targetIndex);
                  setDraggingPageId(null);
                  setDragOver(null);
                }}
                className={
                  "relative " +
                  (isDragging ? "opacity-60" : "")
                }
              >
                {isDragOver && overPlacement === "above" && (
                  <div className="absolute left-0 right-0 h-0.5 -top-1 bg-blue-400 rounded" />
                )}
                {isDragOver && overPlacement === "below" && (
                  <div className="absolute left-0 right-0 h-0.5 -bottom-1 bg-blue-400 rounded" />
                )}
                <PagePreview page={page} index={i} />
              </div>

              <InsertPageButton insertIndex={i + 1} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
