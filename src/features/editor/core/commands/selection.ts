// Selection commands

import { useSelectionStore } from "../../stores/selectionStore";
import { useDocStore } from "../../stores/docStore";

export function selectAll(): void {
  const { doc } = useDocStore.getState();
  if (!doc) return;

  const allIds = doc.nodes.map((n) => n.id);
  useSelectionStore.getState().selectMultiple(allIds);
}

export function clearSelection(): void {
  useSelectionStore.getState().clearSelection();
}

export function selectNode(id: string): void {
  useSelectionStore.getState().select(id);
}

export function toggleSelectNode(id: string): void {
  useSelectionStore.getState().toggleSelect(id);
}
