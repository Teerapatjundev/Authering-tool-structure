"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Group } from "react-konva";
import { Button } from "@/components/ui/button";
import { useDocStore } from "@/features/editor/stores/docStore";
import { RenderNodes } from "@/features/editor/renderer/konva/RenderNodes";
import type { Page } from "@/features/editor/core/doc/types";

const PREVIEW_WIDTH = 232; // 256 (w-64) - 24 (p-3)

function DuplicatePageIcon(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="#FFFFFF"
      style={{ opacity: 1 }}
      className={props.className}
    >
      <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 0 1 3.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0 1 21 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 0 1 7.5 16.125z" />
      <path d="M15 5.25a5.23 5.23 0 0 0-1.279-3.434a9.77 9.77 0 0 1 6.963 6.963A5.23 5.23 0 0 0 17.25 7.5h-1.875A.375.375 0 0 1 15 7.125zM4.875 6H6v10.125A3.375 3.375 0 0 0 9.375 19.5H16.5v1.125c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V7.875C3 6.839 3.84 6 4.875 6" />
    </svg>
  );
}

function DeletePageIcon(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="#FFFFFF"
      style={{ opacity: 1 }}
      className={props.className}
    >
      <path d="M7 21q-.825 0-1.412-.587T5 19V6q-.425 0-.712-.288T4 5t.288-.712T5 4h4q0-.425.288-.712T10 3h4q.425 0 .713.288T15 4h4q.425 0 .713.288T20 5t-.288.713T19 6v13q0 .825-.587 1.413T17 21zm5-7.1l1.9 1.9q.275.275.7.275t.7-.275t.275-.7t-.275-.7l-1.9-1.9l1.9-1.9q.275-.275.275-.7t-.275-.7t-.7-.275t-.7.275L12 11.1l-1.9-1.9q-.275-.275-.7-.275t-.7.275t-.275.7t.275.7l1.9 1.9l-1.9 1.9q-.275.275-.275.7t.275.7t.7.275t.7-.275z" />
    </svg>
  );
}

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
  const duplicatePage = useDocStore((s) => s.duplicatePage);
  const deletePage = useDocStore((s) => s.deletePage);
  const canDelete = (doc?.pages?.length ?? 0) > 1;

  const previewRef = useRef<HTMLDivElement | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number>(PREVIEW_WIDTH);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    const update = () => {
      const next = Math.max(1, el.clientWidth);
      setPreviewWidth(next);
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const safePageWidth = Math.max(1, page.width);
  const safePageHeight = Math.max(1, page.height);
  const scale = previewWidth / safePageWidth;
  const previewHeight = Math.max(1, Math.round(safePageHeight * scale));

  return (
    <div className="w-full">
      <div className="mb-1 text-xs text-gray-600">Page {index + 1}</div>

      <div
        ref={previewRef}
        role="button"
        tabIndex={0}
        onClick={() => setActivePage(page.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActivePage(page.id);
          }
        }}
        className={
          "relative group w-full overflow-hidden rounded-md border text-left outline-none " +
          (isActive ? "border-blue-300" : "border-gray-200")
        }
      >
        <div
          data-page-action="true"
          className="absolute z-10 flex items-center gap-1 transition-opacity opacity-0 top-1 right-1 group-hover:opacity-100"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            draggable={false}
            className="p-0 h-7 w-7 bg-black/70 hover:bg-black/80"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              duplicatePage(page.id);
            }}
            aria-label={`Duplicate page ${index + 1}`}
          >
            <DuplicatePageIcon className="w-6 h-6" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            draggable={false}
            disabled={!canDelete}
            className="p-0 h-7 w-7 bg-black/70 hover:bg-black/80 disabled:bg-black/40"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              deletePage(page.id);
            }}
            aria-label={`Delete page ${index + 1}`}
          >
            <DeletePageIcon className="w-5 h-5" />
          </Button>
        </div>

        <Stage
          width={previewWidth}
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
      </div>
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
                  const target = e.target as HTMLElement | null;
                  if (target?.closest?.('[data-page-action="true"]')) {
                    e.preventDefault();
                    return;
                  }
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
