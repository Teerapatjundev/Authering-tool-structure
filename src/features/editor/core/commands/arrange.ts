// Arrange commands (layer order, alignment)

import { useDocStore } from "../../stores/docStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useHistoryStore } from "../history/historyStore";
import { ArrangeOp, TransformOp } from "../history/ops";

export function bringToFront(): void {
  const { doc, setNodes } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const selectedIds = new Set(getSelectedIds());
  if (selectedIds.size === 0) return;

  const oldOrder = doc.nodes.map((n) => n.id);
  const selected = doc.nodes.filter((n) => selectedIds.has(n.id));
  const others = doc.nodes.filter((n) => !selectedIds.has(n.id));
  const newNodes = [...others, ...selected];

  const op: ArrangeOp = {
    type: "arrange",
    timestamp: Date.now(),
    oldOrder,
    newOrder: newNodes.map((n) => n.id),
  };

  useHistoryStore.getState().commit(op);
}

export function sendToBack(): void {
  const { doc, setNodes } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const selectedIds = new Set(getSelectedIds());
  if (selectedIds.size === 0) return;

  const oldOrder = doc.nodes.map((n) => n.id);
  const selected = doc.nodes.filter((n) => selectedIds.has(n.id));
  const others = doc.nodes.filter((n) => !selectedIds.has(n.id));
  const newNodes = [...selected, ...others];

  const op: ArrangeOp = {
    type: "arrange",
    timestamp: Date.now(),
    oldOrder,
    newOrder: newNodes.map((n) => n.id),
  };

  useHistoryStore.getState().commit(op);
}

export function alignLeft(): void {
  const { doc, updateNodes } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const selectedIds = getSelectedIds();
  if (selectedIds.length < 2) return;

  const selectedNodes = doc.nodes.filter((n) => selectedIds.includes(n.id));
  const minX = Math.min(...selectedNodes.map((n) => n.x - n.width / 2));

  const updates = selectedNodes.map((n) => ({
    id: n.id,
    oldProps: { x: n.x },
    newProps: { x: minX + n.width / 2 },
  }));

  const op: TransformOp = {
    type: "transform",
    timestamp: Date.now(),
    updates,
  };

  useHistoryStore.getState().commit(op);
}

export function alignCenter(): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const selectedIds = getSelectedIds();
  if (selectedIds.length < 2) return;

  const selectedNodes = doc.nodes.filter((n) => selectedIds.includes(n.id));
  const avgX =
    selectedNodes.reduce((sum, n) => sum + n.x, 0) / selectedNodes.length;

  const updates = selectedNodes.map((n) => ({
    id: n.id,
    oldProps: { x: n.x },
    newProps: { x: avgX },
  }));

  const op: TransformOp = {
    type: "transform",
    timestamp: Date.now(),
    updates,
  };

  useHistoryStore.getState().commit(op);
}

export function alignRight(): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const selectedIds = getSelectedIds();
  if (selectedIds.length < 2) return;

  const selectedNodes = doc.nodes.filter((n) => selectedIds.includes(n.id));
  const maxX = Math.max(...selectedNodes.map((n) => n.x + n.width / 2));

  const updates = selectedNodes.map((n) => ({
    id: n.id,
    oldProps: { x: n.x },
    newProps: { x: maxX - n.width / 2 },
  }));

  const op: TransformOp = {
    type: "transform",
    timestamp: Date.now(),
    updates,
  };

  useHistoryStore.getState().commit(op);
}

export function alignTop(): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const selectedIds = getSelectedIds();
  if (selectedIds.length < 2) return;

  const selectedNodes = doc.nodes.filter((n) => selectedIds.includes(n.id));
  const minY = Math.min(...selectedNodes.map((n) => n.y - n.height / 2));

  const updates = selectedNodes.map((n) => ({
    id: n.id,
    oldProps: { y: n.y },
    newProps: { y: minY + n.height / 2 },
  }));

  const op: TransformOp = {
    type: "transform",
    timestamp: Date.now(),
    updates,
  };

  useHistoryStore.getState().commit(op);
}

export function alignMiddle(): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const selectedIds = getSelectedIds();
  if (selectedIds.length < 2) return;

  const selectedNodes = doc.nodes.filter((n) => selectedIds.includes(n.id));
  const avgY =
    selectedNodes.reduce((sum, n) => sum + n.y, 0) / selectedNodes.length;

  const updates = selectedNodes.map((n) => ({
    id: n.id,
    oldProps: { y: n.y },
    newProps: { y: avgY },
  }));

  const op: TransformOp = {
    type: "transform",
    timestamp: Date.now(),
    updates,
  };

  useHistoryStore.getState().commit(op);
}

export function alignBottom(): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const selectedIds = getSelectedIds();
  if (selectedIds.length < 2) return;

  const selectedNodes = doc.nodes.filter((n) => selectedIds.includes(n.id));
  const maxY = Math.max(...selectedNodes.map((n) => n.y + n.height / 2));

  const updates = selectedNodes.map((n) => ({
    id: n.id,
    oldProps: { y: n.y },
    newProps: { y: maxY - n.height / 2 },
  }));

  const op: TransformOp = {
    type: "transform",
    timestamp: Date.now(),
    updates,
  };

  useHistoryStore.getState().commit(op);
}
