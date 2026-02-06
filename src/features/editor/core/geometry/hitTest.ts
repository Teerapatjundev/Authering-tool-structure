import { Node } from "../doc/types";
import { getNodeBounds, boundsContainsPoint } from "./bounds";

export function hitTestNode(node: Node, x: number, y: number): boolean {
  const bounds = getNodeBounds(node);

  // Simple AABB hit test (ignoring rotation for simplicity in MVP)
  // In production, use proper rotated rect hit testing
  return boundsContainsPoint(bounds, x, y);
}

export function findTopNodeAt(
  nodes: Node[],
  x: number,
  y: number,
): Node | null {
  // Search from end (top) to start (bottom)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (!node.visible || node.locked) continue;
    if (hitTestNode(node, x, y)) {
      return node;
    }
  }
  return null;
}
