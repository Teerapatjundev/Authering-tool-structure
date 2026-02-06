// Transform commands

import { Node } from "../doc/types";
import { useDocStore } from "../../stores/docStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useHistoryStore } from "../history/historyStore";
import { MoveOp, TransformOp } from "../history/ops";

export function commitMove(
  updates: Array<{ id: string; changes: { x: number; y: number } }>,
): void {
  const { doc } = useDocStore.getState();
  if (!doc) return;

  const moveOp: MoveOp = {
    type: "move",
    timestamp: Date.now(),
    updates: updates.map((u) => {
      const node = doc.nodes.find((n) => n.id === u.id)!;
      return {
        id: u.id,
        oldX: node.x,
        oldY: node.y,
        newX: u.changes.x,
        newY: u.changes.y,
      };
    }),
  };

  useHistoryStore.getState().commit(moveOp);
}

export function commitTransform(
  updates: Array<{ id: string; changes: Partial<Node> }>,
): void {
  const { doc } = useDocStore.getState();
  if (!doc) return;

  const transformOp: TransformOp = {
    type: "transform",
    timestamp: Date.now(),
    updates: updates.map((u) => {
      const node = doc.nodes.find((n) => n.id === u.id)!;
      const oldProps: Partial<Node> = {};
      const newProps: Partial<Node> = {};

      for (const key of Object.keys(u.changes)) {
        (oldProps as any)[key] = (node as any)[key](newProps as any)[key] = (
          u.changes as any
        )[key];
      }

      return {
        id: u.id,
        oldProps,
        newProps,
      };
    }),
  };

  useHistoryStore.getState().commit(transformOp);
}

export function nudgeSelection(dx: number, dy: number): void {
  const { getSelectedIds } = useSelectionStore.getState();
  const { doc, updateNodes } = useDocStore.getState();
  if (!doc) return;

  const selectedIds = getSelectedIds();
  if (selectedIds.length === 0) return;

  const updates = selectedIds.map((id: string) => {
    const node = doc.nodes.find((n) => n.id === id)!;
    return {
      id,
      changes: { x: node.x + dx, y: node.y + dy },
    };
  });

  updateNodes(updates);
  commitMove(updates);
}
