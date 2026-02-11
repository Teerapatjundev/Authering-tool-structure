/**
 * ===============================================
 * SELECTION COMMANDS - คำสั่งเลือก Node
 * ===============================================
 *
 * คำสั่งสำหรับจัดการการเลือก:
 * - selectAll: เลือกทุก node
 * - clearSelection: ยกเลิกเลือกทั้งหมด
 * - selectNode: เลือก node เดียว
 * - toggleSelectNode: สลับการเลือก node
 */

import { useSelectionStore } from "../../stores/selectionStore";
import { useDocStore } from "../../stores/docStore";

/** เลือกทุก node ใน document */
export function selectAll(): void {
  const { doc } = useDocStore.getState();
  if (!doc) return;

  const allIds = doc.nodes.map((n) => n.id);
  useSelectionStore.getState().selectMultiple(allIds);
}

/** ยกเลิกเลือกทั้งหมด */
export function clearSelection(): void {
  useSelectionStore.getState().clearSelection();
}

/** เลือก node เดียว */
export function selectNode(id: string): void {
  useSelectionStore.getState().select(id);
}

/** สลับการเลือก node (toggle) */
export function toggleSelectNode(id: string): void {
  useSelectionStore.getState().toggleSelect(id);
}
