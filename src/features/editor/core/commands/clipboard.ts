// Clipboard commands

import { useDocStore } from "../../stores/docStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useHistoryStore } from "../history/historyStore";
import { DeleteOp, InsertOp } from "../history/ops";
import { Node } from "../doc/types";
import { generateNodeId } from "@/shared/utils/id";

let clipboard: Node[] = [];

export function copy(): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const selectedIds = getSelectedIds();
  const selectedNodes = doc.nodes.filter((n) => selectedIds.includes(n.id));

  clipboard = selectedNodes.map((n) => ({ ...n }));
}

export function cut(): void {
  copy();
  deleteSelected();
}

export function paste(): void {
  if (clipboard.length === 0) return;

  // Clone and offset
  const newNodes = clipboard.map((n) => ({
    ...n,
    id: generateNodeId(),
    x: n.x + 20,
    y: n.y + 20,
  }));

  const op: InsertOp = {
    type: "insert",
    timestamp: Date.now(),
    nodes: newNodes,
  };

  useHistoryStore.getState().commit(op);

  // Select pasted nodes
  useSelectionStore.getState().selectMultiple(newNodes.map((n) => n.id));
}

export function deleteSelected(): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds, clearSelection } = useSelectionStore.getState();
  if (!doc) return;

  const selectedIds = getSelectedIds();
  if (selectedIds.length === 0) return;

  const deletedNodes = doc.nodes.filter((n) => selectedIds.includes(n.id));

  const op: DeleteOp = {
    type: "delete",
    timestamp: Date.now(),
    nodeIds: selectedIds,
    deletedNodes,
  };

  useHistoryStore.getState().commit(op);
  clearSelection();
}

export function duplicate(): void {
  copy();
  paste();
}
