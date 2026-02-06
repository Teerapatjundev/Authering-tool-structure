// Core document types

export type NodeType =
  | "rect"
  | "ellipse"
  | "text"
  | "image"
  | "video"
  | "group";

export interface BaseNode {
  id: string;
  type: NodeType;
  x: number; // CENTER x
  y: number; // CENTER y
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  name?: string;
}

export interface RectNode extends BaseNode {
  type: "rect";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

export interface EllipseNode extends BaseNode {
  type: "ellipse";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface TextNode extends BaseNode {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontStyle?: "normal" | "bold" | "italic";
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
}

export interface ImageNode extends BaseNode {
  type: "image";
  src: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
}

export interface VideoNode extends BaseNode {
  type: "video";
  src: string;
  posterSrc?: string;
}

export interface GroupNode extends BaseNode {
  type: "group";
  children: string[]; // child node IDs
}

export type Node =
  | RectNode
  | EllipseNode
  | TextNode
  | ImageNode
  | VideoNode
  | GroupNode;

export interface Document {
  id: string;
  title: string;
  version: number;
  nodes: Node[];
  width: number;
  height: number;
  backgroundColor: string;
  updatedAt: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
