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
 * ข้าม nodes ที่ถูกล็อค
 */
export function copy(): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const page = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
  if (!page) return;

  const selectedIds = getSelectedIds();
  const selectedNodes = page.nodes.filter(
    (n) => selectedIds.includes(n.id) && !n.locked,
  );

  if (selectedNodes.length === 0) return;

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

  const { doc } = useDocStore.getState();
  if (!doc) return;
  const pageId = doc.activePageId;

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
    pageId,
    nodes: newNodes,
  };

  useHistoryStore.getState().commit(op);

  // เลือก nodes ที่วางใหม่
  useSelectionStore.getState().selectMultiple(newNodes.map((n) => n.id));
}

/**
 * ลบ nodes ที่เลือก
 * ข้าม nodes ที่ถูกล็อค
 */
export function deleteSelected(): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds, clearSelection } = useSelectionStore.getState();
  if (!doc) return;

  const pageId = doc.activePageId;

  const page = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
  if (!page) return;

  const selectedIds = getSelectedIds();
  if (selectedIds.length === 0) return;

  // กรอง nodes ที่ไม่ถูกล็อคเท่านั้น
  const deletableNodes = page.nodes.filter(
    (n) => selectedIds.includes(n.id) && !n.locked,
  );
  if (deletableNodes.length === 0) return;

  const deletableIds = deletableNodes.map((n) => n.id);

  const op: DeleteOp = {
    type: "delete",
    timestamp: Date.now(),
    pageId,
    nodeIds: deletableIds,
    deletedNodes: deletableNodes,
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
