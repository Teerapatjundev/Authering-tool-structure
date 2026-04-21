"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Lock, Unlock, Search } from "lucide-react";
import { useDocStore } from "@/features/editor/stores/docStore";
import { useSelectionStore } from "@/features/editor/stores/selectionStore";
import type { Node } from "@/features/editor/core/doc/types";

type LayerItem = {
  id: string;
  node: Node;
  createdIndex: number;
};

function getLayerName(node: Node, createdIndex: number) {
  if (node.type === "text" || node.type === "textlink") {
    const rawText = String(node.text || "").trim();
    if (rawText.length > 0) return rawText.slice(0, 28);
  }
  if (node.type === "audio" && node.name) return node.name;
  return `${node.type.toUpperCase()} ${createdIndex + 1}`;
}

export function LayoutPanel() {
  const doc = useDocStore((s) => s.doc);
  const updateNode = useDocStore((s) => s.updateNode);
  const reorderActivePageNodes = useDocStore((s) => s.reorderActivePageNodes);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const select = useSelectionStore((s) => s.select);

  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{
    layerId: string;
    placement: "above" | "below";
  } | null>(null);

  const activePage = doc?.pages.find((p) => p.id === doc.activePageId) ?? doc?.pages[0] ?? null;
  const nodes = activePage?.nodes ?? [];

  // Reverse chronological: latest-created node appears at top of the list.
  const layers = useMemo<LayerItem[]>(
    () =>
      nodes
        .map((node, index) => ({ id: node.id, node, createdIndex: index }))
        .reverse(),
    [nodes],
  );

  const query = search.trim().toLowerCase();
  const filteredLayers = useMemo(() => {
    if (!query) return layers;
    return layers.filter(({ node, createdIndex }) =>
      getLayerName(node, createdIndex).toLowerCase().includes(query),
    );
  }, [layers, query]);

  const handleDrop = (draggedId: string, targetId: string, placement: "above" | "below") => {
    const topFirstIds = layers.map((item) => item.id);
    const fromIndex = topFirstIds.indexOf(draggedId);
    const targetIndex = topFirstIds.indexOf(targetId);
    if (fromIndex < 0 || targetIndex < 0) return;

    let insertAt = targetIndex + (placement === "below" ? 1 : 0);
    const nextTopFirst = [...topFirstIds];
    const [moved] = nextTopFirst.splice(fromIndex, 1);
    if (!moved) return;
    if (fromIndex < insertAt) insertAt -= 1;
    nextTopFirst.splice(insertAt, 0, moved);

    // Canvas draws bottom -> top, so convert back to chronological order.
    reorderActivePageNodes([...nextTopFirst].reverse());
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#F4F4F5]">
      <div className="p-3">
        <div className="relative">
          <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 right-2 top-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ Object"
            className="w-full h-8 pl-3 pr-8 text-sm bg-white border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-red-300"
          />
        </div>
      </div>

      <div className="flex-1 px-3 pb-3 overflow-auto">
        {filteredLayers.length === 0 ? (
          <div className="px-2 py-4 text-sm text-gray-500">
            {layers.length === 0 ? "ยังไม่มี Layer บน Canvas" : "ไม่พบ Layer ที่ค้นหา"}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLayers.map(({ id, node, createdIndex }) => {
              const isSelected = selectedIds.has(id);
              const isDragging = draggingId === id;
              const isDragOver = dragOver?.layerId === id;

              return (
                <div
                  key={id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingId(id);
                    setDragOver(null);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("application/x-editor-layer-id", id);
                    e.dataTransfer.setData("text/plain", id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOver(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const placement = e.clientY - rect.top > rect.height / 2 ? "below" : "above";
                    setDragOver({ layerId: id, placement });
                  }}
                  onDragLeave={() => {
                    setDragOver((curr) => (curr?.layerId === id ? null : curr));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedId =
                      e.dataTransfer.getData("application/x-editor-layer-id") ||
                      e.dataTransfer.getData("text/plain");
                    if (!draggedId) return;

                    const rect = e.currentTarget.getBoundingClientRect();
                    const placement = e.clientY - rect.top > rect.height / 2 ? "below" : "above";
                    handleDrop(draggedId, id, placement);
                    setDraggingId(null);
                    setDragOver(null);
                  }}
                  className={"relative rounded-md " + (isDragging ? "opacity-60" : "")}
                >
                  {isDragOver && dragOver?.placement === "above" && (
                    <div className="absolute left-0 right-0 h-0.5 -top-0.5 bg-red-400 rounded" />
                  )}
                  {isDragOver && dragOver?.placement === "below" && (
                    <div className="absolute left-0 right-0 h-0.5 -bottom-0.5 bg-red-400 rounded" />
                  )}

                  <button
                    type="button"
                    onClick={() => select(id)}
                    className={
                      "flex items-center w-full gap-2 px-2 py-1.5 text-sm rounded-md transition-colors " +
                      (isSelected ? "bg-white border border-red-200" : "hover:bg-white/80")
                    }
                  >
                    <span className="flex-1 text-left text-gray-700 truncate">
                      {getLayerName(node, createdIndex)}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateNode(id, { visible: !node.visible });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          updateNode(id, { visible: !node.visible });
                        }
                      }}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label={node.visible ? "Hide layer" : "Show layer"}
                    >
                      {node.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateNode(id, { locked: !node.locked });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          updateNode(id, { locked: !node.locked });
                        }
                      }}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label={node.locked ? "Unlock layer" : "Lock layer"}
                    >
                      {node.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
