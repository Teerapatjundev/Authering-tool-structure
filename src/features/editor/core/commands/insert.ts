// Insert commands

import {
  Node,
  RectNode,
  EllipseNode,
  TextNode,
  ImageNode,
  VideoNode,
} from "../doc/types";
import { generateNodeId } from "@/shared/utils/id";
import { useHistoryStore } from "../history/historyStore";
import { InsertOp } from "../history/ops";

export function insertRect(
  x: number,
  y: number,
  width = 100,
  height = 100,
): void {
  const node: RectNode = {
    id: generateNodeId(),
    type: "rect",
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: "#3b82f6",
    stroke: "#1e40af",
    strokeWidth: 2,
    cornerRadius: 0,
  };

  const op: InsertOp = {
    type: "insert",
    timestamp: Date.now(),
    nodes: [node],
  };

  useHistoryStore.getState().commit(op);
}

export function insertEllipse(
  x: number,
  y: number,
  width = 100,
  height = 100,
): void {
  const node: EllipseNode = {
    id: generateNodeId(),
    type: "ellipse",
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: "#10b981",
    stroke: "#059669",
    strokeWidth: 2,
  };

  const op: InsertOp = {
    type: "insert",
    timestamp: Date.now(),
    nodes: [node],
  };

  useHistoryStore.getState().commit(op);
}

export function insertText(x: number, y: number, text = "Text"): void {
  const node: TextNode = {
    id: generateNodeId(),
    type: "text",
    x,
    y,
    width: 200,
    height: 50,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    text,
    fontSize: 24,
    fontFamily: "Arial",
    fill: "#000000",
    fontStyle: "normal",
    align: "left",
  };

  const op: InsertOp = {
    type: "insert",
    timestamp: Date.now(),
    nodes: [node],
  };

  useHistoryStore.getState().commit(op);
}

export function insertImage(
  x: number,
  y: number,
  src: string,
  width = 200,
  height = 200,
): void {
  const node: ImageNode = {
    id: generateNodeId(),
    type: "image",
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    src,
  };

  const op: InsertOp = {
    type: "insert",
    timestamp: Date.now(),
    nodes: [node],
  };

  useHistoryStore.getState().commit(op);
}

export function insertVideo(
  x: number,
  y: number,
  src: string,
  width = 400,
  height = 300,
): void {
  const node: VideoNode = {
    id: generateNodeId(),
    type: "video",
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    src,
  };

  const op: InsertOp = {
    type: "insert",
    timestamp: Date.now(),
    nodes: [node],
  };

  useHistoryStore.getState().commit(op);
}
