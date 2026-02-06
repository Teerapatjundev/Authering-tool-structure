// Edit commands - for editing node properties

import { Node } from "../doc/types";
import { useDocStore } from "../../stores/docStore";
import { useHistoryStore } from "../history/historyStore";
import { EditOp } from "../history/ops";

export function editNode(nodeId: string, changes: Partial<Node>): void {
  const { doc } = useDocStore.getState();
  if (!doc) return;

  const node = doc.nodes.find((n) => n.id === nodeId);
  if (!node) return;

  const oldProps: Partial<Node> = {};
  const newProps: Partial<Node> = {};

  for (const key of Object.keys(changes)) {
    (oldProps as any)[key] = (node as any)[key];
    (newProps as any)[key] = (changes as any)[key];
  }

  const op: EditOp = {
    type: "edit",
    timestamp: Date.now(),
    nodeId,
    oldProps,
    newProps,
  };

  useHistoryStore.getState().commit(op);
}
