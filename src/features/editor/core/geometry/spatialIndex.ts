// Spatial index for fast node lookups
// For MVP, use simple linear search. In production, use R-tree or grid

import { Node } from "../doc/types";
import { Bounds, getNodeBounds, boundsIntersect } from "./bounds";

export class SpatialIndex {
  private nodes: Node[] = [];

  update(nodes: Node[]): void {
    this.nodes = nodes;
  }

  queryRect(bounds: Bounds): Node[] {
    const result: Node[] = [];
    for (const node of this.nodes) {
      if (!node.visible) continue;
      const nodeBounds = getNodeBounds(node);
      if (boundsIntersect(nodeBounds, bounds)) {
        result.push(node);
      }
    }
    return result;
  }

  queryPoint(x: number, y: number): Node[] {
    return this.queryRect({ x, y, width: 0, height: 0 });
  }
}
