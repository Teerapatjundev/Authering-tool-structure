/**
 * ===============================================
 * CLIPBOARD COMMANDS - คำสั่ง Copy/Paste/Delete
 * ===============================================
 *
 * คำสั่งสำหรับจัดการ clipboard:
 * - copy: คัดลอก nodes ที่เลือก
 * - cut: ตัด nodes (copy + delete)
 * - paste: วาง nodes จาก clipboard
 * - duplicate: ทำซ้ำ nodes (copy + paste)
 * - deleteSelected: ลบ nodes ที่เลือก
 */

import { useDocStore } from "../../stores/docStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useHistoryStore } from "../history/historyStore";
import { DeleteOp, InsertOp } from "../history/ops";
import { Node } from "../doc/types";
import { generateNodeId } from "@/shared/utils/id";

// Clipboard เก็บ nodes ที่ copy ไว้
let clipboard: Node[] = [];

/**
 * คัดลอก nodes ที่เลือกไว้ใน clipboard
 */
export function copy(): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const selectedIds = getSelectedIds();
  const selectedNodes = doc.nodes.filter((n) => selectedIds.includes(n.id));

  // Deep copy nodes
  clipboard = selectedNodes.map((n) => ({ ...n }));
}

/**
 * ตัด nodes (copy แล้ว delete)
 */
export function cut(): void {
  copy();
  deleteSelected();
}

/**
 * วาง nodes จาก clipboard
 * สร้าง nodes ใหม่ที่ offset ไป 20px
 */
export function paste(): void {
  if (clipboard.length === 0) return;

  // Clone และ offset ตำแหน่ง
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

  // เลือก nodes ที่วางใหม่
  useSelectionStore.getState().selectMultiple(newNodes.map((n) => n.id));
}

/**
 * ลบ nodes ที่เลือก
 */
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

/**
 * ทำซ้ำ nodes ที่เลือก (copy + paste)
 */
export function duplicate(): void {
  copy();
  paste();
}
