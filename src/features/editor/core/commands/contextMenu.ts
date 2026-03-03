/**
 * ===============================================
 * CONTEXT MENU COMMANDS
 * ===============================================
 *
 * คำสั่งจาก Context Menu (คลิกขวา / กดค้าง):
 *
 * 1. copyAsMaster  - คัดลอกเป็น Master (แก้ Master → อัพเดททุก Instance)
 * 2. alignNodes    - จัดตำแหน่ง (ซ้าย, กลาง, ขวา, บน, กลาง, ล่าง)
 * 3. reorderLayer  - จัดเรียง Layer (บนสุด, ล่างสุด, ขึ้น, ลง)
 * 4. lockToggle    - ล็อค/ปลดล็อค Object
 * 5. groupNodes    - รวมกลุ่ม Objects
 * 6. ungroupNodes  - แยกกลุ่ม Objects
 */

import { useDocStore } from "../../stores/docStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useHistoryStore } from "../history/historyStore";
import { EditOp, InsertOp, MoveOp } from "../history/ops";
import { Node } from "../doc/types";
import { getNodeBounds, getMultiSelectionBounds } from "../geometry/bounds";
import { generateNodeId } from "@/shared/utils/id";

// =============================================
// ALIGNMENT
// =============================================
export type AlignDirection =
  | "left"
  | "center-h"
  | "right"
  | "top"
  | "center-v"
  | "bottom";

/**
 * จัดตำแหน่ง nodes ที่เลือก
 * @param direction - ทิศทางการจัด (left, center-h, right, top, center-v, bottom)
 */
export function alignNodes(direction: AlignDirection): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const page = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
  if (!page) return;

  const selectedIds = getSelectedIds();
  if (selectedIds.length < 2) return;

  const selectedNodes = page.nodes.filter((n) => selectedIds.includes(n.id));
  const bounds = getMultiSelectionBounds(selectedNodes);
  if (!bounds) return;

  const updates: Array<{
    id: string;
    oldX: number;
    oldY: number;
    newX: number;
    newY: number;
  }> = [];

  for (const node of selectedNodes) {
    const nb = getNodeBounds(node);
    let newX = node.x;
    let newY = node.y;

    switch (direction) {
      case "left":
        // ชิดซ้ายตาม bounds รวม
        newX = bounds.x + node.width / 2;
        break;
      case "center-h":
        // กึ่งกลางแนวนอน
        newX = bounds.x + bounds.width / 2;
        break;
      case "right":
        // ชิดขวา
        newX = bounds.x + bounds.width - node.width / 2;
        break;
      case "top":
        // ชิดบน
        newY = bounds.y + node.height / 2;
        break;
      case "center-v":
        // กึ่งกลางแนวตั้ง
        newY = bounds.y + bounds.height / 2;
        break;
      case "bottom":
        // ชิดล่าง
        newY = bounds.y + bounds.height - node.height / 2;
        break;
    }

    if (newX !== node.x || newY !== node.y) {
      updates.push({
        id: node.id,
        oldX: node.x,
        oldY: node.y,
        newX,
        newY,
      });
    }
  }

  if (updates.length === 0) return;

  const moveOp: MoveOp = {
    type: "move",
    timestamp: Date.now(),
    updates,
  };

  useHistoryStore.getState().commit(moveOp);
}

// =============================================
// LAYER ORDERING
// =============================================
export type LayerAction = "bring-to-front" | "send-to-back" | "bring-forward" | "send-backward";

/**
 * จัดเรียงลำดับ Layer ของ nodes
 * @param action - "bring-to-front" | "send-to-back" | "bring-forward" | "send-backward"
 *
 * ลำดับ nodes ใน array = ลำดับ Layer (index 0 = ล่างสุด)
 */
export function reorderLayer(action: LayerAction): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const page = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
  if (!page) return;

  const selectedIds = new Set(getSelectedIds());
  if (selectedIds.size === 0) return;

  const nodes = [...page.nodes];
  const selectedIndices = nodes
    .map((n, i) => (selectedIds.has(n.id) ? i : -1))
    .filter((i) => i !== -1);

  let reordered: Node[];

  switch (action) {
    case "bring-to-front": {
      // ย้ายไปท้าย array (บนสุด)
      const selected = selectedIndices.map((i) => nodes[i]);
      const rest = nodes.filter((n) => !selectedIds.has(n.id));
      reordered = [...rest, ...selected];
      break;
    }
    case "send-to-back": {
      // ย้ายไปต้น array (ล่างสุด)
      const selected = selectedIndices.map((i) => nodes[i]);
      const rest = nodes.filter((n) => !selectedIds.has(n.id));
      reordered = [...selected, ...rest];
      break;
    }
    case "bring-forward": {
      // เลื่อนขึ้น 1 ตำแหน่ง
      reordered = [...nodes];
      for (let i = reordered.length - 2; i >= 0; i--) {
        if (selectedIds.has(reordered[i].id) && !selectedIds.has(reordered[i + 1].id)) {
          [reordered[i], reordered[i + 1]] = [reordered[i + 1], reordered[i]];
        }
      }
      break;
    }
    case "send-backward": {
      // เลื่อนลง 1 ตำแหน่ง
      reordered = [...nodes];
      for (let i = 1; i < reordered.length; i++) {
        if (selectedIds.has(reordered[i].id) && !selectedIds.has(reordered[i - 1].id)) {
          [reordered[i], reordered[i - 1]] = [reordered[i - 1], reordered[i]];
        }
      }
      break;
    }
  }

  // อัพเดท doc.nodes โดยตรง (ไม่ผ่าน history สำหรับ reorder)
  useDocStore.getState().setDoc({
    ...doc,
    pages: doc.pages.map((p) => (p.id === page.id ? { ...p, nodes: reordered } : p)),
    updatedAt: Date.now(),
  });
}

// =============================================
// LOCK / UNLOCK
// =============================================

/**
 * สลับ Lock/Unlock ของ nodes ที่เลือก
 */
export function toggleLock(): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const page = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
  if (!page) return;

  const selectedIds = getSelectedIds();
  if (selectedIds.length === 0) return;

  // ถ้ามี node ที่ไม่ได้ล็อคอยู่ → ล็อคทั้งหมด, ถ้าล็อคหมดแล้ว → ปลดล็อคทั้งหมด
  const selectedNodes = page.nodes.filter((n) => selectedIds.includes(n.id));
  const allLocked = selectedNodes.every((n) => n.locked);
  const newLocked = !allLocked;

  for (const node of selectedNodes) {
    if (node.locked !== newLocked) {
      const op: EditOp = {
        type: "edit",
        timestamp: Date.now(),
        nodeId: node.id,
        oldProps: { locked: node.locked },
        newProps: { locked: newLocked },
      };
      useHistoryStore.getState().commit(op);
    }
  }
}

// =============================================
// GROUP / UNGROUP
// =============================================

/**
 * รวมกลุ่ม nodes ที่เลือก
 * ใช้ groupId ร่วมกัน เพื่อระบุว่าเป็นกลุ่มเดียวกัน
 */
export function groupNodes(): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const page = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
  if (!page) return;

  const selectedIds = getSelectedIds();
  if (selectedIds.length < 2) return;

  const groupId = generateNodeId(); // สร้าง groupId ใหม่

  for (const nodeId of selectedIds) {
    const node = page.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const op: EditOp = {
      type: "edit",
      timestamp: Date.now(),
      nodeId,
      oldProps: { groupId: node.groupId, groupRotation: node.groupRotation },
      newProps: { groupId, groupRotation: undefined },
    };
    useHistoryStore.getState().commit(op);
  }
}

/**
 * แยกกลุ่ม nodes ที่เลือก
 */
export function ungroupNodes(): void {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return;

  const page = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
  if (!page) return;

  const selectedIds = getSelectedIds();
  if (selectedIds.length === 0) return;

  const selectedNodes = page.nodes.filter((n) => selectedIds.includes(n.id));

  for (const node of selectedNodes) {
    if (!node.groupId) continue;

    const op: EditOp = {
      type: "edit",
      timestamp: Date.now(),
      nodeId: node.id,
      oldProps: { groupId: node.groupId, groupRotation: node.groupRotation },
      newProps: { groupId: undefined, groupRotation: undefined },
    };
    useHistoryStore.getState().commit(op);
  }
}

/**
 * ตรวจสอบว่า nodes ที่เลือกมีกลุ่มหรือไม่
 */
export function hasGroup(): boolean {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return false;

  const page = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
  if (!page) return false;

  const selectedIds = getSelectedIds();
  const selectedNodes = page.nodes.filter((n) => selectedIds.includes(n.id));
  return selectedNodes.some((n) => !!n.groupId);
}

/**
 * ตรวจสอบว่า nodes ที่เลือกทั้งหมดอยู่ใน group เดียวกันหรือไม่
 * ถ้าทุก node มี groupId เดียวกัน (และไม่ใช่ undefined) → true
 * ใช้สำหรับซ่อนปุ่ม "รวมกลุ่ม" เมื่อ nodes ถูก group อยู่แล้ว
 */
export function allInSameGroup(): boolean {
  const { doc } = useDocStore.getState();
  const { getSelectedIds } = useSelectionStore.getState();
  if (!doc) return false;

  const page = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
  if (!page) return false;

  const selectedIds = getSelectedIds();
  if (selectedIds.length < 2) return false;

  const selectedNodes = page.nodes.filter((n) => selectedIds.includes(n.id));
  if (selectedNodes.length < 2) return false;

  const firstGroupId = selectedNodes[0].groupId;
  if (!firstGroupId) return false;

  return selectedNodes.every((n) => n.groupId === firstGroupId);
}

// =============================================
// MASTER / INSTANCE (Copy as Master)
// =============================================
