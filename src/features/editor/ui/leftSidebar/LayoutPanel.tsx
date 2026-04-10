"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, Layers2, Lock, Search, Unlock } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { Node } from "../../core/doc/types";
import { useDocStore } from "../../stores/docStore";
import { useSelectionStore } from "../../stores/selectionStore";

const ACCENT = "#ED1C24";

function getNodeDisplayLabel(node: Node): string {
  const t = (s: string | undefined) => (s ?? "").trim();
  if (node.type === "text" && t(node.text)) return t(node.text)!.slice(0, 120);
  if (node.type === "textlink" && t(node.text)) return t(node.text)!.slice(0, 120);
  if (node.type === "accordion" && t(node.title)) return t(node.title)!.slice(0, 120);
  if (node.type === "audio" && t(node.name)) return t(node.name)!;
  if (node.practice?.title && t(node.practice.title)) return t(node.practice.title)!;

  const typeLabel: Record<Node["type"], string> = {
    rect: "Rectangle",
    ellipse: "Ellipse",
    triangle: "Triangle",
    pentagon: "Pentagon",
    text: "Text",
    textlink: "Link",
    image: "Image",
    video: "Video",
    audio: "Audio",
    path: "Stroke",
    accordion: "Accordion",
  };
  return typeLabel[node.type];
}

function matchesSearch(node: Node, q: string): boolean {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  return getNodeDisplayLabel(node).toLowerCase().includes(needle);
}

function SortableLayerRow({
  node,
  selected,
  onRowClick,
  onToggleVisible,
  onToggleLock,
}: {
  node: Node;
  selected: boolean;
  onRowClick: () => void;
  onToggleVisible: () => void;
  onToggleLock: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const label = getNodeDisplayLabel(node);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "flex items-center gap-2 rounded-lg border border-transparent px-2 py-2 text-sm select-none " +
        (selected ? "border-[#f5c2c7] bg-[#FFE5E6]" : "bg-white hover:bg-gray-50") +
        (isDragging ? " z-10 opacity-90 shadow-md" : "")
      }
    >
      <button
        type="button"
        className="min-w-0 flex-1 text-left font-semibold truncate cursor-grab active:cursor-grabbing touch-none"
        style={{ color: selected ? ACCENT : "#374151" }}
        {...attributes}
        {...listeners}
        onClick={onRowClick}
        title={label}
      >
        {label}
      </button>
      <div className="flex flex-shrink-0 items-center gap-0.5">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/80 hover:text-gray-800"
          aria-label={node.visible ? "ซ่อน" : "แสดง"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisible();
          }}
        >
          {node.visible ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4 text-gray-400" />
          )}
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/80 hover:text-gray-800"
          aria-label={node.locked ? "ปลดล็อค" : "ล็อค"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
        >
          {node.locked ? (
            <Lock className="h-4 w-4 text-[#ED1C24]" />
          ) : (
            <Unlock className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function StaticLayerRow({
  node,
  selected,
  onRowClick,
  onToggleVisible,
  onToggleLock,
}: {
  node: Node;
  selected: boolean;
  onRowClick: () => void;
  onToggleVisible: () => void;
  onToggleLock: () => void;
}) {
  const label = getNodeDisplayLabel(node);
  return (
    <div
      className={
        "flex items-center gap-2 rounded-lg border border-transparent px-2 py-2 text-sm select-none " +
        (selected ? "border-[#f5c2c7] bg-[#FFE5E6]" : "bg-white hover:bg-gray-50")
      }
    >
      <button
        type="button"
        className="min-w-0 flex-1 text-left font-semibold truncate"
        style={{ color: selected ? ACCENT : "#374151" }}
        onClick={onRowClick}
        title={label}
      >
        {label}
      </button>
      <div className="flex flex-shrink-0 items-center gap-0.5">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/80 hover:text-gray-800"
          aria-label={node.visible ? "ซ่อน" : "แสดง"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisible();
          }}
        >
          {node.visible ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4 text-gray-400" />
          )}
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/80 hover:text-gray-800"
          aria-label={node.locked ? "ปลดล็อค" : "ล็อค"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
        >
          {node.locked ? (
            <Lock className="h-4 w-4 text-[#ED1C24]" />
          ) : (
            <Unlock className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export function LayoutPanel() {
  const doc = useDocStore((s) => s.doc);
  const updateNode = useDocStore((s) => s.updateNode);
  const reorderActivePageNodes = useDocStore((s) => s.reorderActivePageNodes);
  const autoSave = useDocStore((s) => s.autoSave);

  const select = useSelectionStore((s) => s.select);
  const selectedIds = useSelectionStore((s) => s.selectedIds);

  const [search, setSearch] = useState("");

  const activePage =
    doc?.pages.find((p) => p.id === doc?.activePageId) ?? doc?.pages[0] ?? null;
  const nodes = activePage?.nodes ?? [];

  const pageNumber =
    doc && activePage ? doc.pages.findIndex((p) => p.id === activePage.id) + 1 : 1;

  /** บนรายการ = วาดทับบนสุด (ตัวท้ายของ page.nodes) */
  const uiOrder = useMemo(() => [...nodes].reverse(), [nodes]);

  const searchActive = search.trim().length > 0;
  const filteredUi = useMemo(
    () => uiOrder.filter((n) => matchesSearch(n, search)),
    [uiOrder, search],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (searchActive) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = uiOrder.map((n) => n.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const newUiIds = arrayMove(ids, oldIndex, newIndex);
    const backToFront = [...newUiIds].reverse();
    reorderActivePageNodes(backToFront);
    autoSave();
  };

  const persistNode = (nodeId: string, changes: Partial<Node>) => {
    updateNode(nodeId, changes);
    autoSave();
  };

  if (!doc || !activePage) {
    return (
      <div className="p-4 text-sm text-gray-500">กำลังโหลดเอกสาร…</div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <header className="flex-shrink-0 space-y-1">
        <div className="flex items-center gap-2">
          <Layers2 className="h-5 w-5 flex-shrink-0" style={{ color: ACCENT }} />
          <h3 className="text-base font-bold" style={{ color: ACCENT }}>
            Layers ({nodes.length})
          </h3>
        </div>
        <p className="pl-7 text-xs text-gray-500">Page : {pageNumber}</p>
      </header>

      <InputGroup className="flex-shrink-0 rounded-lg border-gray-200">
        <InputGroupInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาจากชื่อ Object"
          className="placeholder:text-gray-400"
        />
        <InputGroupAddon align="inline-end" className="text-gray-400">
          <Search className="h-4 w-4" />
        </InputGroupAddon>
      </InputGroup>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {nodes.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">ยังไม่มี Object ในหน้านี้</p>
        ) : searchActive ? (
          <div className="flex flex-col gap-1">
            {filteredUi.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">ไม่พบชื่อที่ค้นหา</p>
            ) : (
              filteredUi.map((node) => (
                <StaticLayerRow
                  key={node.id}
                  node={node}
                  selected={selectedIds.has(node.id)}
                  onRowClick={() => select(node.id)}
                  onToggleVisible={() =>
                    persistNode(node.id, { visible: !node.visible })
                  }
                  onToggleLock={() => persistNode(node.id, { locked: !node.locked })}
                />
              ))
            )}
            <p className="pt-2 text-center text-[11px] text-gray-400">
              ล้างช่องค้นหาเพื่อลากเรียงเลเยอร์
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={uiOrder.map((n) => n.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-1">
                {uiOrder.map((node) => (
                  <SortableLayerRow
                    key={node.id}
                    node={node}
                    selected={selectedIds.has(node.id)}
                    onRowClick={() => select(node.id)}
                    onToggleVisible={() =>
                      persistNode(node.id, { visible: !node.visible })
                    }
                    onToggleLock={() => persistNode(node.id, { locked: !node.locked })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
