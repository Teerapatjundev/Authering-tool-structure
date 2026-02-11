/**
 * ===============================================
 * HISTORY OPERATIONS
 * ===============================================
 *
 * ประเภทของ Operation สำหรับระบบ Undo/Redo
 * ทุก operation ต้องสามารถ reverse (inverse) ได้
 *
 * Operations:
 * - insert: เพิ่ม node
 * - delete: ลบ node
 * - move: ย้าย node
 * - transform: เปลี่ยน size/rotation
 * - edit: แก้ไขคุณสมบัติอื่นๆ
 */

import { Node } from "../doc/types";

// ประเภทของ Operation
export type OpType = "insert" | "delete" | "move" | "transform" | "edit";

// Base interface ที่ทุก operation มี
export interface BaseOp {
  type: OpType;
  timestamp: number;
}

// เพิ่ม nodes ใหม่
export interface InsertOp extends BaseOp {
  type: "insert";
  nodes: Node[];
}

// ลบ nodes
export interface DeleteOp extends BaseOp {
  type: "delete";
  nodeIds: string[];
  deletedNodes: Node[]; // เก็บไว้สำหรับ undo
}

// ย้าย nodes
export interface MoveOp extends BaseOp {
  type: "move";
  updates: Array<{
    id: string;
    oldX: number;
    oldY: number;
    newX: number;
    newY: number;
  }>;
}

// เปลี่ยน size/rotation
export interface TransformOp extends BaseOp {
  type: "transform";
  updates: Array<{
    id: string;
    oldProps: Partial<Node>;
    newProps: Partial<Node>;
  }>;
}

// แก้ไขคุณสมบัติอื่นๆ (เช่น text, fill)
export interface EditOp extends BaseOp {
  type: "edit";
  nodeId: string;
  oldProps: Partial<Node>;
  newProps: Partial<Node>;
}

// รวม Operation ทั้งหมด
export type Operation = InsertOp | DeleteOp | MoveOp | TransformOp | EditOp;

/**
 * สร้าง Operation ที่ตรงข้าม (สำหรับ Undo)
 * @param op - Operation ที่ต้องการ reverse
 * @returns Operation ที่ตรงข้าม
 */
export function inverseOp(op: Operation): Operation {
  switch (op.type) {
    case "insert":
      // Inverse ของ insert คือ delete
      return {
        type: "delete",
        timestamp: Date.now(),
        nodeIds: op.nodes.map((n) => n.id),
        deletedNodes: op.nodes,
      };

    case "delete":
      // Inverse ของ delete คือ insert
      return {
        type: "insert",
        timestamp: Date.now(),
        nodes: op.deletedNodes,
      };

    case "move":
      // สลับ old กับ new
      return {
        type: "move",
        timestamp: Date.now(),
        updates: op.updates.map((u) => ({
          id: u.id,
          oldX: u.newX,
          oldY: u.newY,
          newX: u.oldX,
          newY: u.oldY,
        })),
      };

    case "transform":
      // สลับ oldProps กับ newProps
      return {
        type: "transform",
        timestamp: Date.now(),
        updates: op.updates.map((u) => ({
          id: u.id,
          oldProps: u.newProps,
          newProps: u.oldProps,
        })),
      };

    case "edit":
      // สลับ oldProps กับ newProps
      return {
        type: "edit",
        timestamp: Date.now(),
        nodeId: op.nodeId,
        oldProps: op.newProps,
        newProps: op.oldProps,
      };
  }
}
