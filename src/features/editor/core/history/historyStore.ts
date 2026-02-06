import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Operation, inverseOp } from "./ops";
import { useDocStore } from "../../stores/docStore";

interface HistoryState {
  past: Operation[];
  future: Operation[];

  // Actions
  commit: (op: Operation) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  immer((set, get) => ({
    past: [],
    future: [],

    commit: (op: Operation) => {
      set((state) => {
        state.past.push(op);
        state.future = []; // Clear redo stack
      });

      // Apply operation
      applyOperation(op);

      // Auto-save
      useDocStore.getState().autoSave();
    },

    undo: () => {
      const { past, future } = get();
      if (past.length === 0) return;

      const op = past[past.length - 1];
      const inverse = inverseOp(op);

      set((state) => {
        state.past.pop();
        state.future.push(op);
      });

      applyOperation(inverse);
      useDocStore.getState().autoSave();
    },

    redo: () => {
      const { future } = get();
      if (future.length === 0) return;

      const op = future[future.length - 1];

      set((state) => {
        state.future.pop();
        state.past.push(op);
      });

      applyOperation(op);
      useDocStore.getState().autoSave();
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    clear: () => {
      set({ past: [], future: [] });
    },
  })),
);

function applyOperation(op: Operation): void {
  const { doc, updateNodes, addNode, removeNodes, setNodes } =
    useDocStore.getState();
  if (!doc) return;

  switch (op.type) {
    case "insert":
      op.nodes.forEach((node) => addNode(node));
      break;

    case "delete":
      removeNodes(op.nodeIds);
      break;

    case "move":
      updateNodes(
        op.updates.map((u) => ({
          id: u.id,
          changes: { x: u.newX, y: u.newY },
        })),
      );
      break;

    case "transform":
      updateNodes(
        op.updates.map((u) => ({
          id: u.id,
          changes: u.newProps,
        })),
      );
      break;

    case "edit":
      updateNodes([
        {
          id: op.nodeId,
          changes: op.newProps,
        },
      ]);
      break;

    case "arrange":
      // Reorder nodes
      const nodeMap = new Map(doc.nodes.map((n) => [n.id, n]));
      const newNodes = op.newOrder
        .map((id) => nodeMap.get(id)!)
        .filter(Boolean);
      setNodes(newNodes);
      break;
  }
}
