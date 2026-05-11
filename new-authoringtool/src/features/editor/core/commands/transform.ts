/**
 * ===============================================
 * TRANSFORM COMMANDS - คำสั่งย้าย/ปรับขนาด
 * ===============================================
 *
 * คำสั่งสำหรับ transform nodes:
 * - commitMove: บันทึกการย้าย nodes
 * - commitTransform: บันทึกการเปลี่ยน size/rotation
 * - nudgeSelection: เลื่อน nodes ด้วยลูกศร
 */

import { Node } from "../doc/types";
import { useDocStore } from "../../stores/docStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useHistoryStore } from "../history/historyStore";
import { MoveOp, TransformOp } from "../history/ops";

/**
 * บันทึกการย้าย nodes (หลังจากลากเสร็จ)
 * @param updates - Array ของ { id, changes: { x, y } }
 * @deprecated Use commitMoveWithOriginal instead for proper undo/redo
 */
export function commitMove(
  updates: Array<{ id: string; changes: { x: number; y: number } }>,
): void {
  const { doc } = useDocStore.getState();
  if (!doc) return;

  const page = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
  if (!page) return;

  const moveOp: MoveOp = {
    type: "move",
    timestamp: Date.now(),
    pageId: doc.activePageId,
    updates: updates.map((u) => {
      const node = page.nodes.find((n) => n.id === u.id)!;
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

/**
 * บันทึกการย้าย nodes พร้อมตำแหน่งเดิม (สำหรับ undo/redo ที่ถูกต้อง)
 * @param originalPositions - Map ของ nodeId -> { x, y } ตำแหน่งเดิม
 * @param newPositions - Map ของ nodeId -> { x, y } ตำแหน่งใหม่
 */
export function commitMoveWithOriginal(
  originalPositions: Map<string, { x: number; y: number }>,
  newPositions: Map<string, { x: number; y: number }>,
): void {
  if (originalPositions.size === 0) return;

  const { doc } = useDocStore.getState();
  if (!doc) return;

  // ตรวจสอบว่ามีการเปลี่ยนตำแหน่งจริงหรือไม่
  let hasChanged = false;
  originalPositions.forEach((orig, id) => {
    const newPos = newPositions.get(id);
    if (newPos && (orig.x !== newPos.x || orig.y !== newPos.y)) {
      hasChanged = true;
    }
  });

  if (!hasChanged) return;

  const moveOp: MoveOp = {
    type: "move",
    timestamp: Date.now(),
    pageId: doc.activePageId,
    updates: Array.from(originalPositions.entries()).map(([id, orig]) => {
      const newPos = newPositions.get(id) || orig;
      return {
        id,
        oldX: orig.x,
        oldY: orig.y,
        newX: newPos.x,
        newY: newPos.y,
      };
    }),
  };

  useHistoryStore.getState().commit(moveOp);
}

/**
 * บันทึกการ transform nodes (resize, rotate)
 * @param updates - Array ของ { id, changes: Partial<Node> }
 */
export function commitTransform(
  updates: Array<{ id: string; changes: Partial<Node> }>,
): void {
  const { doc } = useDocStore.getState();
  if (!doc) return;

  const page = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
  if (!page) return;

  const transformOp: TransformOp = {
    type: "transform",
    timestamp: Date.now(),
    pageId: doc.activePageId,
    updates: updates.map((u) => {
      const node = page.nodes.find((n) => n.id === u.id)!;
      const oldProps: Partial<Node> = {};
      const newProps: Partial<Node> = {};

      for (const key of Object.keys(u.changes)) {
        const k = key as keyof Node;
        (oldProps as any)[k] = (node as any)[k];
        (newProps as any)[k] = (u.changes as any)[k];
      }

      return { id: u.id, oldProps, newProps };
    }),
  };

  useHistoryStore.getState().commit(transformOp);
}

/**
 * เลื่อน nodes ที่เลือกด้วยลูกศร (nudge)
 * @param dx - ระยะ X (บวก = ขวา, ลบ = ซ้าย)
 * @param dy - ระยะ Y (บวก = ล่าง, ลบ = บน)
 */
export function nudgeSelection(dx: number, dy: number): void {
  const { getSelectedIds } = useSelectionStore.getState();
  const { doc, updateNodes } = useDocStore.getState();
  if (!doc) return;

  const page = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
  if (!page) return;

  const selectedIds = getSelectedIds();
  if (selectedIds.length === 0) return;

  // เก็บตำแหน่งเดิมก่อน
  const originalPositions = new Map<string, { x: number; y: number }>();
  selectedIds.forEach((id: string) => {
    const node = page.nodes.find((n) => n.id === id);
    if (node) {
      originalPositions.set(id, { x: node.x, y: node.y });
    }
  });

  // คำนวณตำแหน่งใหม่
  const updates = selectedIds.map((id: string) => {
    const node = page.nodes.find((n) => n.id === id)!;
    return {
      id,
      changes: { x: node.x + dx, y: node.y + dy },
    };
  });

  // อัพเดทตำแหน่ง
  updateNodes(updates);

  // สร้าง map ตำแหน่งใหม่
  const newPositions = new Map<string, { x: number; y: number }>();
  updates.forEach(({ id, changes }) => {
    newPositions.set(id, { x: changes.x, y: changes.y });
  });

  // บันทึก history ด้วยตำแหน่งเดิมและใหม่
  commitMoveWithOriginal(originalPositions, newPositions);
}
