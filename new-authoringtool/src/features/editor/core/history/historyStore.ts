/**
 * ===============================================
 * HISTORY STORE - ระบบ Undo/Redo
 * ===============================================
 *
 * จัดการ history สำหรับ undo/redo operations
 *
 * โครงสร้าง:
 * - past: Stack ของ operations ที่ทำไปแล้ว (สำหรับ undo)
 * - future: Stack ของ operations ที่ undo ไปแล้ว (สำหรับ redo)
 *
 * Flow:
 * 1. ทำ action → commit(op) → push to past, clear future
 * 2. Undo → pop from past, apply inverse, push to future
 * 3. Redo → pop from future, apply, push to past
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useDocStore } from "../../stores/docStore";
import { inverseOp, Operation } from "./ops";

interface HistoryState {
  past: Operation[];
  future: Operation[];

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

    /**
     * บันทึก operation ใหม่
     * - เพิ่ม op เข้า past
     * - ลบ future ทั้งหมด (redo จะไม่ได้แล้ว)
     * - Apply operation
     * - Auto-save
     */
    commit: (op: Operation) => {
      set((state) => {
        state.past.push(op);
        state.future = [];
      });

      applyOperation(op);
      useDocStore.getState().autoSave();
    },

    /**
     * Undo operation ล่าสุด
     */
    undo: () => {
      const { past } = get();
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

    /**
     * Redo operation ที่ undo ไป
     */
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

/**
 * Apply operation ไปยัง document
 * @param op - Operation ที่ต้องการ apply
 */
function applyOperation(op: Operation): void {
  const {
    doc,
    updateNodesOnPage,
    addNodeToPage,
    removeNodesFromPage,
    setPagesSnapshot,
  } = useDocStore.getState();
  if (!doc) return;

  switch (op.type) {
    case "insert":
      // เพิ่ม nodes
      op.nodes.forEach((node) => addNodeToPage(op.pageId, node));
      break;

    case "delete":
      // ลบ nodes
      removeNodesFromPage(op.pageId, op.nodeIds);
      break;

    case "move":
      // ย้าย nodes
      updateNodesOnPage(
        op.pageId,
        op.updates.map((u) => ({
          id: u.id,
          changes: { x: u.newX, y: u.newY },
        })),
      );
      break;

    case "transform":
      // Transform nodes (resize, rotate)
      updateNodesOnPage(
        op.pageId,
        op.updates.map((u) => ({
          id: u.id,
          changes: u.newProps,
        })),
      );
      break;

    case "edit":
      // แก้ไข properties
      updateNodesOnPage(op.pageId, [
        {
          id: op.nodeId,
          changes: op.newProps,
        },
      ]);
      break;

    case "pages":
      setPagesSnapshot(op.newPages, op.newActivePageId);
      break;
  }
}
