// Operation types for history

import { Node } from "../doc/types";

export type OpType =
  | "insert"
  | "delete"
  | "move"
  | "transform"
  | "edit"
  | "arrange";

export interface BaseOp {
  type: OpType;
  timestamp: number;
}

export interface InsertOp extends BaseOp {
  type: "insert";
  nodes: Node[];
}

export interface DeleteOp extends BaseOp {
  type: "delete";
  nodeIds: string[];
  deletedNodes: Node[]; // For undo
}

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

export interface TransformOp extends BaseOp {
  type: "transform";
  updates: Array<{
    id: string;
    oldProps: Partial<Node>;
    newProps: Partial<Node>;
  }>;
}

export interface EditOp extends BaseOp {
  type: "edit";
  nodeId: string;
  oldProps: Partial<Node>;
  newProps: Partial<Node>;
}

export interface ArrangeOp extends BaseOp {
  type: "arrange";
  oldOrder: string[];
  newOrder: string[];
}

export type Operation =
  | InsertOp
  | DeleteOp
  | MoveOp
  | TransformOp
  | EditOp
  | ArrangeOp;

export function inverseOp(op: Operation): Operation {
  switch (op.type) {
    case "insert":
      return {
        type: "delete",
        timestamp: Date.now(),
        nodeIds: op.nodes.map((n) => n.id),
        deletedNodes: op.nodes,
      };

    case "delete":
      return {
        type: "insert",
        timestamp: Date.now(),
        nodes: op.deletedNodes,
      };

    case "move":
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
      return {
        type: "edit",
        timestamp: Date.now(),
        nodeId: op.nodeId,
        oldProps: op.newProps,
        newProps: op.oldProps,
      };

    case "arrange":
      return {
        type: "arrange",
        timestamp: Date.now(),
        oldOrder: op.newOrder,
        newOrder: op.oldOrder,
      };
  }
}
