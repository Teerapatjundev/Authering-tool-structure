// Transform math utilities

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export function applyTransformDelta(
  original: Transform,
  delta: Partial<Transform>,
): Transform {
  return {
    x: original.x + (delta.x || 0),
    y: original.y + (delta.y || 0),
    scaleX: original.scaleX * (delta.scaleX || 1),
    scaleY: original.scaleY * (delta.scaleY || 1),
    rotation: original.rotation + (delta.rotation || 0),
  };
}

export function getTransformDelta(
  from: Transform,
  to: Transform,
): Partial<Transform> {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
    scaleX: to.scaleX / from.scaleX,
    scaleY: to.scaleY / from.scaleY,
    rotation: to.rotation - from.rotation,
  };
}

export function applyDeltaToNode(
  node: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  },
  delta: {
    dx?: number;
    dy?: number;
    scaleX?: number;
    scaleY?: number;
    dRotation?: number;
  },
): void {
  if (delta.dx !== undefined) node.x += delta.dx;
  if (delta.dy !== undefined) node.y += delta.dy;
  if (delta.scaleX !== undefined) node.width *= delta.scaleX;
  if (delta.scaleY !== undefined) node.height *= delta.scaleY;
  if (delta.dRotation !== undefined) node.rotation += delta.dRotation;
}
