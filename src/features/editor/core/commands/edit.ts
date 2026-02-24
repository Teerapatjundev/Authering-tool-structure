/**
 * ===============================================
 * EDIT COMMANDS - คำสั่งแก้ไขคุณสมบัติ
 * ===============================================
 *
 * คำสั่งสำหรับแก้ไขคุณสมบัติของ node:
 * - editNode: แก้ไข properties (text, fill, fontSize, etc.)
 */

import { Node } from "../doc/types";
import { useDocStore } from "../../stores/docStore";
import { useHistoryStore } from "../history/historyStore";
import { EditOp, TransformOp } from "../history/ops";

/**
 * แก้ไขคุณสมบัติของ node
 * @param nodeId - รหัส node ที่ต้องการแก้
 * @param changes - คุณสมบัติที่ต้องการเปลี่ยน
 *
 * ตัวอย่าง: editNode("node_abc", { text: "Hello", fill: "#ff0000" })
 */
export function editNode(nodeId: string, changes: Partial<Node>): void {
  const { doc } = useDocStore.getState();
  if (!doc) return;

  const node = doc.nodes.find((n) => n.id === nodeId);
  if (!node) return;

  // เก็บค่าเดิมและค่าใหม่
  const oldProps: Partial<Node> = {};
  const newProps: Partial<Node> = {};

  for (const key of Object.keys(changes)) {
    const k = key as keyof Node;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (oldProps as any)[k] = (node as any)[k];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (newProps as any)[k] = (changes as any)[k];
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

/**
 * แก้ไขคุณสมบัติของหลาย nodes พร้อมกัน (single undo step)
 * @param nodeIds - รหัส nodes ที่ต้องการแก้
 * @param changes - คุณสมบัติที่ต้องการเปลี่ยน
 * @param typeFilter - (optional) กรองเฉพาะ node ที่มีประเภทตรง
 */
export function editNodes(
  nodeIds: string[],
  changes: Partial<Node>,
  typeFilter?: string[],
): void {
  const { doc } = useDocStore.getState();
  if (!doc) return;

  const updates: Array<{
    id: string;
    oldProps: Partial<Node>;
    newProps: Partial<Node>;
  }> = [];

  for (const nodeId of nodeIds) {
    const node = doc.nodes.find((n) => n.id === nodeId);
    if (!node) continue;
    if (typeFilter && !typeFilter.includes(node.type)) continue;

    const oldProps: Partial<Node> = {};
    const newProps: Partial<Node> = {};

    for (const key of Object.keys(changes)) {
      const k = key as keyof Node;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (oldProps as any)[k] = (node as any)[k];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (newProps as any)[k] = (changes as any)[k];
    }

    updates.push({ id: nodeId, oldProps, newProps });
  }

  if (updates.length === 0) return;

  // ถ้ามี node เดียว ใช้ EditOp, ถ้าหลาย nodes ใช้ TransformOp
  if (updates.length === 1) {
    const u = updates[0];
    const op: EditOp = {
      type: "edit",
      timestamp: Date.now(),
      nodeId: u.id,
      oldProps: u.oldProps,
      newProps: u.newProps,
    };
    useHistoryStore.getState().commit(op);
  } else {
    const op: TransformOp = {
      type: "transform",
      timestamp: Date.now(),
      updates,
    };
    useHistoryStore.getState().commit(op);
  }
}
