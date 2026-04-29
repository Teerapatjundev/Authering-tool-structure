"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Group } from "react-konva";
import { Button } from "@/components/ui/button";
import { useDocStore } from "@/features/editor/stores/docStore";
import {
  deletePage as commitDeletePage,
  duplicatePage as commitDuplicatePage,
  insertPageAt as commitInsertPageAt,
} from "@/features/editor/core/commands/pages";
import { RenderNodes } from "@/features/editor/renderer/konva/RenderNodes";
import type { Page } from "@/features/editor/core/doc/types";

const PREVIEW_WIDTH = 232; // 256 (w-64) - 24 (p-3)
const INSERT_ROW_HEIGHT = 32; // py-1 + inner h-6
const ROW_GAP = 12; // gap-3

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, size };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function previewHeightForPage(page: Page, previewWidth: number) {
  const safePageWidth = Math.max(1, page.width);
  const safePageHeight = Math.max(1, page.height);
  const scale = previewWidth / safePageWidth;
  const previewHeight = Math.max(1, Math.round(safePageHeight * scale));

  // Rough chrome: borders/rounding wrappers around the Stage.
  const CHROME_Y = 8;
  return { scale, previewHeight, itemHeight: previewHeight + CHROME_Y };
}

function buildOffsets(heights: number[]) {
  const offsets = new Array<number>(heights.length);
  let acc = 0;
  for (let i = 0; i < heights.length; i++) {
    offsets[i] = acc;
    acc += heights[i];
  }
  return { offsets, total: acc };
}

function findStartIndex(offsets: number[], heights: number[], scrollTop: number) {
  // Binary search for the last item whose start <= scrollTop
  let lo = 0;
  let hi = offsets.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const start = offsets[mid];
    const end = start + heights[mid];
    if (scrollTop < start) {
      hi = mid - 1;
    } else if (scrollTop >= end) {
      lo = mid + 1;
      ans = lo;
    } else {
      return mid;
    }
  }
  return clamp(ans, 0, Math.max(0, offsets.length - 1));
}

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
  return (
    <button
      type="button"
      onClick={() => commitInsertPageAt(insertIndex)}
      className="flex items-center justify-center w-full py-1"
      aria-label="Add page"
    >
      <div className="group flex items-center w-60 rounded-lg border-dashed justify-center bg-white border border-[#5C5E70] h-6 hover:bg-[#FFE5E6] hover:border-[#ED1C24]">
        <svg
          className="text-[#5C5E70] group-hover:text-[#ED1C24]"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 1.58805e-07C6.41775 1.58805e-07 4.87103 0.469192 3.55544 1.34824C2.23985 2.22729 1.21447 3.47672 0.608967 4.93853C0.00346602 6.40034 -0.15496 8.00887 0.153721 9.56072C0.462403 11.1126 1.22433 12.538 2.34315 13.6569C3.46197 14.7757 4.88743 15.5376 6.43928 15.8463C7.99113 16.155 9.59966 15.9965 11.0615 15.391C12.5233 14.7855 13.7727 13.7602 14.6518 12.4446C15.5308 11.129 16 9.58225 16 8C16.0002 6.94936 15.7934 5.90898 15.3915 4.93828C14.9895 3.96758 14.4002 3.08559 13.6573 2.34268C12.9144 1.59977 12.0324 1.0105 11.0617 0.608537C10.091 0.206574 9.05064 -0.000209193 8 1.58805e-07ZM11.2669 8.79681H8.79681V11.2669C8.79681 11.4783 8.71287 11.6809 8.56343 11.8304C8.414 11.9798 8.21133 12.0637 8 12.0637C7.78867 12.0637 7.586 11.9798 7.43657 11.8304C7.28714 11.6809 7.20319 11.4783 7.20319 11.2669V8.79681H4.73307C4.52174 8.79681 4.31907 8.71286 4.16964 8.56343C4.02021 8.414 3.93626 8.21133 3.93626 8C3.93626 7.78867 4.02021 7.586 4.16964 7.43657C4.31907 7.28713 4.52174 7.20319 4.73307 7.20319H7.20319V4.73307C7.20319 4.52174 7.28714 4.31907 7.43657 4.16963C7.586 4.0202 7.78867 3.93625 8 3.93625C8.21133 3.93625 8.414 4.0202 8.56343 4.16963C8.71287 4.31907 8.79681 4.52174 8.79681 4.73307V7.20319H11.2669C11.4783 7.20319 11.6809 7.28713 11.8304 7.43657C11.9798 7.586 12.0637 7.78867 12.0637 8C12.0637 8.21133 11.9798 8.414 11.8304 8.56343C11.6809 8.71286 11.4783 8.79681 11.2669 8.79681Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </button>
  );
}

function PagePreview({
  page,
  index,
  previewWidth,
}: {
  page: Page;
  index: number;
  previewWidth: number;
}) {
  const doc = useDocStore((s) => s.doc);
  const setActivePage = useDocStore((s) => s.setActivePage);
  const isActive = !!doc && doc.activePageId === page.id;
  const canDelete = (doc?.pages?.length ?? 0) > 1;

  const safePageWidth = Math.max(1, page.width);
  const safePageHeight = Math.max(1, page.height);
  const scale = previewWidth / safePageWidth;
  const previewHeight = Math.max(1, Math.round(safePageHeight * scale));

  return (
    <div className="mx-auto w-60 rounded-lg border border-gray-200 bg-white justify-center flex flex-col items-center">
      <div
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
          (isActive ? "border-2 border-[#ED1C24] " : "border-gray-200")
        }
      >
        <div
          data-page-action="true"
          className="absolute z-10 flex items-center gap-1 transition-opacity opacity-0 top-1 right-1 group-hover:opacity-100"
        >
          {/* Duplicate page button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            draggable={false}
            className="p-0 h-7 w-7 bg-black/70 hover:bg-black/80"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              commitDuplicatePage(page.id);
            }}
            aria-label={`Duplicate page ${index + 1}`}
          >
            <DuplicatePageIcon className="w-6 h-6" />
          </Button>

          {/* Delete page button */}
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
              commitDeletePage(page.id);
            }}
            aria-label={`Delete page ${index + 1}`}
          >
            <DeletePageIcon className="w-5 h-5" />
          </Button>
        </div>
        {/* Page */}
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
  const [dragOver, setDragOver] = useState<{
    pageId: string;
    placement: "above" | "below";
  } | null>(null);

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

  type ListItem =
    | { type: "insert"; key: string; insertIndex: number; height: number }
    | { type: "page"; key: string; page: Page; index: number; height: number; previewWidth: number };

  const items: ListItem[] = useMemo(() => {
    const previewWidth = PREVIEW_WIDTH;
    const next: ListItem[] = [];

    // Insert button before first page.
    next.push({
      type: "insert",
      key: "insert-0",
      insertIndex: 0,
      height: INSERT_ROW_HEIGHT + ROW_GAP,
    });

    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const { itemHeight } = previewHeightForPage(p, previewWidth);
      next.push({
        type: "page",
        key: `page-${p.id}`,
        page: p,
        index: i,
        previewWidth,
        height: itemHeight + ROW_GAP,
      });
      next.push({
        type: "insert",
        key: `insert-${i + 1}`,
        insertIndex: i + 1,
        height: INSERT_ROW_HEIGHT + ROW_GAP,
      });
    }

    return next;
  }, [pages]);

  const heights = useMemo(() => items.map((it) => it.height), [items]);
  const { offsets, total } = useMemo(() => buildOffsets(heights), [heights]);

  const { ref: scrollRef, size: scrollSize } = useElementSize<HTMLDivElement>();
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = useMemo(() => {
    if (items.length === 0) return 0;
    return findStartIndex(offsets, heights, scrollTop);
  }, [items.length, offsets, heights, scrollTop]);

  const endIndex = useMemo(() => {
    if (items.length === 0) return 0;
    const bottom = scrollTop + scrollSize.height;
    let idx = findStartIndex(offsets, heights, bottom);
    // Ensure we include the partially-visible item.
    if (idx < items.length) idx += 1;
    return idx;
  }, [items.length, offsets, heights, scrollTop, scrollSize.height]);

  const overscan = 6;
  const renderFrom = Math.max(0, startIndex - overscan);
  const renderTo = Math.min(items.length, endIndex + overscan);

  return (
    <div
      ref={scrollRef}
      className="flex-1 p-3 overflow-auto"
      onScroll={(e) => {
        setScrollTop((e.currentTarget as HTMLDivElement).scrollTop);
      }}
    >
      <div className="relative" style={{ height: total }}>
        {items.slice(renderFrom, renderTo).map((item, localIdx) => {
          const idx = renderFrom + localIdx;
          const top = offsets[idx] ?? 0;

          if (item.type === "insert") {
            return (
              <div
                key={item.key}
                style={{ position: "absolute", top, left: 0, right: 0 }}
              >
                <InsertPageButton insertIndex={item.insertIndex} />
              </div>
            );
          }

          const page = item.page;
          const i = item.index;
          const isDragging = draggingPageId === page.id;
          const isDragOver = dragOver?.pageId === page.id;
          const overPlacement = isDragOver ? dragOver?.placement : null;

          return (
            <div
              key={item.key}
              style={{ position: "absolute", top, left: 0, right: 0 }}
            >
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
                  e.dataTransfer.setData(
                    "application/x-editor-page-id",
                    page.id,
                  );
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
                  setDragOver((curr) =>
                    curr?.pageId === page.id ? null : curr,
                  );
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
                className={"relative " + (isDragging ? "opacity-60" : "")}
              >
                {isDragOver && overPlacement === "above" && (
                  <div className="absolute left-0 right-0 h-0.5 -top-1 bg-blue-400 rounded" />
                )}
                {isDragOver && overPlacement === "below" && (
                  <div className="absolute left-0 right-0 h-0.5 -bottom-1 bg-blue-400 rounded" />
                )}
                <PagePreview page={page} index={i} previewWidth={item.previewWidth} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
