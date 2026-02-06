import { Node } from "../doc/types";

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  guidesX: number[];
  guidesY: number[];
}

export interface SnapGuide {
  type: "vertical" | "horizontal";
  position: number;
  offset: number; // how far from the snap position
}

const SNAP_THRESHOLD = 8;

export function snapNode(
  node: Node,
  allNodes: Node[],
  dragDelta: { x: number; y: number },
): SnapResult {
  const targetX = node.x + dragDelta.x;
  const targetY = node.y + dragDelta.y;

  let snappedX = targetX;
  let snappedY = targetY;
  let didSnapX = false;
  let didSnapY = false;
  const guidesX: number[] = [];
  const guidesY: number[] = [];

  // Simple center-to-center snapping
  for (const other of allNodes) {
    if (other.id === node.id || !other.visible) continue;

    // Snap X
    if (!didSnapX && Math.abs(targetX - other.x) < SNAP_THRESHOLD) {
      snappedX = other.x;
      didSnapX = true;
      guidesX.push(other.x);
    }

    // Snap Y
    if (!didSnapY && Math.abs(targetY - other.y) < SNAP_THRESHOLD) {
      snappedY = other.y;
      didSnapY = true;
      guidesY.push(other.y);
    }

    if (didSnapX && didSnapY) break;
  }

  return {
    x: snappedX,
    y: snappedY,
    snappedX: didSnapX,
    snappedY: didSnapY,
    guidesX,
    guidesY,
  };
}
