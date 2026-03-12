/**
 * ===============================================
 * SELECTION CONTROLLER - จัดการกรอบเลือกและการ Transform
 * ===============================================
 *
 * หน้าที่หลัก:
 * - ผูก Konva Transformer เข้ากับ node ที่เลือก (single / multi)
 * - รองรับการย่อ/ขยาย/หมุน แบบ Canva-style
 * - คำนวณ bounds สำหรับ multi-selection ที่มีการหมุนสะสมของกลุ่ม
 * - แสดง/ซ่อน snap guides ระหว่าง resize
 * - commit ประวัติการแก้ไข (history) สำหรับ undo/redo
 *
 * พฤติกรรมสำคัญ:
 * 1) Single Selection
 *    - ใช้ shape จริงของ node เป็นเป้าหมาย transformer
 *    - finalize ขนาด/ตำแหน่ง/rotation กลับลง store
 *
 * 2) Multi Selection
 *    - ใช้ proxy rect (กรอบเสมือน) เป็นตัว transform
 *    - กระจายผล transform ไปยังทุก node ในกลุ่ม
 *    - เก็บ groupRotation เพื่อให้กรอบเลือกเอียงต่อเนื่อง
 *
 * 3) Node-specific finalize
 *    - path: bake geometry กลับเป็น points ใหม่
 *    - ellipse: อัปเดตผ่าน radiusX/radiusY
 *    - triangle/pentagon: อัปเดต scale ตาม base bounds ของ polygon
 *    - video: ใช้ parent group เป็นตัวรับ transform
 *
 * หมายเหตุ:
 * - ปิด flip ขณะ transform เพื่อกันการพลิกแกนที่ทำให้ขนาดเพี้ยน
 * - เลี่ยง live-clamp บางกรณีที่กรอบหมุน เพื่อลดอาการติดขอบล่องหน
 */
"use client";

import { useEffect, useRef } from "react";
import { Transformer, Rect } from "react-konva";
import Konva from "konva";
import { useSelectionStore } from "../../stores/selectionStore";
import { useDocStore } from "../../stores/docStore";
import { useViewStore } from "../../stores/viewStore";
import { useHistoryStore } from "../../core/history/historyStore";
import { useTextEditStore } from "../../stores/textEditStore";
import { TransformOp } from "../../core/history/ops";
import { Node, NodeType, PathNode } from "../../core/doc/types";
import {
  getMultiSelectionBoundsWithRotation,
  getGroupBoundsInRotatedFrame,
} from "../../core/geometry/bounds";
import { snapResizeSize, SizeSnapResult } from "../../core/geometry/snap";
import { useSnapGuidesStore } from "../../stores/snapGuidesStore";
import { TRI_BASE_SIZE, PENT_BASE_SIZE } from "./polygonGeometry";

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

interface SelectionControllerProps {
  stageRef: React.RefObject<Konva.Stage>;
}

interface OrigNodeState {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

const ROTATION_SNAPS = [0, 45, 90, 135, 180, 225, 270, 315];
const ALL_ANCHORS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;
const CORNER_ANCHORS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;
const SCALE_SNAP = 0.01;

/* ------------------------------------------------------------------ */
/*  Shared helpers (extracted from duplicated transform math)          */
/* ------------------------------------------------------------------ */

/** Compute transformed position/size for every node in a multi-selection */
function computeMultiPositions(
  origStates: OrigNodeState[],
  origCenter: { x: number; y: number },
  groupRot: number,
  rawSX: number,
  rawSY: number,
  proxyRot: number,
  cx: number,
  cy: number,
) {
  const deltaRot = proxyRot - groupRot;
  const isPure =
    Math.abs(rawSX - 1) < SCALE_SNAP &&
    Math.abs(rawSY - 1) < SCALE_SNAP &&
    Math.abs(deltaRot) > 0.1;
  const sX = isPure ? 1 : rawSX;
  const sY = isPure ? 1 : rawSY;

  const lr = (-groupRot * Math.PI) / 180;
  const lc = Math.cos(lr),
    ls = Math.sin(lr);
  const wr = (proxyRot * Math.PI) / 180;
  const wc = Math.cos(wr),
    ws = Math.sin(wr);

  return origStates.map((o) => {
    const w = isPure ? o.width : Math.abs(o.width * sX);
    const h = isPure ? o.height : Math.abs(o.height * sY);
    const rx = o.x - origCenter.x,
      ry = o.y - origCenter.y;
    const lx = rx * lc - ry * ls,
      ly = rx * ls + ry * lc;
    const sx = lx * sX,
      sy = ly * sY;
    return {
      id: o.id,
      type: o.type,
      x: cx + sx * wc - sy * ws,
      y: cy + sx * ws + sy * wc,
      width: w,
      height: h,
      rotation: o.rotation + deltaRot,
      origWidth: o.width,
      origHeight: o.height,
    };
  });
}

function bakePathGeometry(
  node: PathNode,
  centerX: number,
  centerY: number,
  rotation: number,
  scaleX: number,
  scaleY: number,
) {
  const baseCx = node.width / 2;
  const baseCy = node.height / 2;

  const transformed: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < node.points.length; i += 2) {
    transformed.push({
      x: (node.points[i] - baseCx) * scaleX + baseCx,
      y: (node.points[i + 1] - baseCy) * scaleY + baseCy,
    });
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of transformed) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const points = transformed.flatMap((p) => [p.x - minX, p.y - minY]);

  const localDeltaX = minX + width / 2 - baseCx;
  const localDeltaY = minY + height / 2 - baseCy;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return {
    x: centerX + localDeltaX * cos - localDeltaY * sin,
    y: centerY + localDeltaX * sin + localDeltaY * cos,
    width,
    height,
    points,
  };
}

function samePoints(a?: number[], b?: number[]) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > 0.0001) return false;
  }
  return true;
}

/** Apply position/size to a Konva shape. finalize=true resets scale to 1. */
function setKonvaShape(
  stage: Konva.Stage,
  id: string,
  type: NodeType,
  x: number,
  y: number,
  w: number,
  h: number,
  rot: number,
  origW: number,
  origH: number,
  finalize: boolean,
) {
  const shape = stage.findOne(`#shape_${id}`);
  if (!shape) return;

  if (type === "video") {
    const p = shape.parent;
    if (!p || p === shape.getLayer()) return;
    p.x(x);
    p.y(y);
    p.rotation(rot);
    if (finalize) {
      p.scaleX(1);
      p.scaleY(1);
      p.offsetX(w / 2);
      p.offsetY(h / 2);
      shape.width(w);
      shape.height(h);
    } else {
      p.scaleX(w / origW);
      p.scaleY(h / origH);
    }
  } else if (type === "ellipse") {
    shape.x(x);
    shape.y(y);
    shape.rotation(rot);
    (shape as Konva.Ellipse).radiusX(w / 2);
    (shape as Konva.Ellipse).radiusY(h / 2);
    if (finalize) {
      shape.scaleX(1);
      shape.scaleY(1);
    }
  } else if (type === "triangle" || type === "pentagon") {
    const base = type === "triangle" ? TRI_BASE_SIZE : PENT_BASE_SIZE;
    shape.x(x);
    shape.y(y);
    shape.rotation(rot);
    (shape as Konva.RegularPolygon).radius(50);
    shape.offsetX(0);
    shape.offsetY(0);
    shape.scaleX(w / Math.max(1, base.width));
    shape.scaleY(h / Math.max(1, base.height));
  } else if (type === "path") {
    shape.x(x);
    shape.y(y);
    shape.rotation(rot);
    if (finalize) {
      shape.width(w);
      shape.height(h);
      shape.offsetX(w / 2);
      shape.offsetY(h / 2);
      shape.scaleX(1);
      shape.scaleY(1);
    } else {
      shape.scaleX(w / Math.max(1, origW));
      shape.scaleY(h / Math.max(1, origH));
    }
  } else {
    shape.x(x);
    shape.y(y);
    shape.rotation(rot);
    shape.width(w);
    shape.height(h);
    shape.offsetX(w / 2);
    shape.offsetY(h / 2);
    if (finalize) {
      shape.scaleX(1);
      shape.scaleY(1);
    }
  }
}

/** Document bounds in screen-space */
function docScreenBounds(d: { width: number; height: number }) {
  const { viewport } = useViewStore.getState();
  const z = viewport.zoom;
  return {
    l: viewport.x,
    t: viewport.y,
    r: d.width * z + viewport.x,
    b: d.height * z + viewport.y,
  };
}

/** Clamp edges of a box to document screen bounds */
function clampEdges(
  box: { x: number; y: number; width: number; height: number },
  db: { l: number; t: number; r: number; b: number },
) {
  let { x, y, width, height } = box;
  if (x < db.l) {
    width -= db.l - x;
    x = db.l;
  }
  if (y < db.t) {
    height -= db.t - y;
    y = db.t;
  }
  if (x + width > db.r) width = db.r - x;
  if (y + height > db.b) height = db.b - y;
  return { x, y, width, height };
}

/** Half extents of a rotated rectangle around its center (world axis-aligned) */
function rotatedHalfExtents(width: number, height: number, rotation: number) {
  const hw = width / 2;
  const hh = height / 2;
  const rad = (rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return {
    halfX: hw * c + hh * s,
    halfY: hw * s + hh * c,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SelectionController({ stageRef }: SelectionControllerProps) {
  const { selectedIds } = useSelectionStore();
  const { doc, updateNodes } = useDocStore();
  const { viewport } = useViewStore();
  const { editingNodeId } = useTextEditStore();

  const activePage =
    doc?.pages.find((p) => p.id === doc.activePageId) ?? doc?.pages[0] ?? null;

  const trRef = useRef<Konva.Transformer>(null);
  const proxyRef = useRef<Konva.Rect>(null);
  const origStatesRef = useRef<OrigNodeState[]>([]);
  const origBoundsRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  const groupRotRef = useRef(0);
  const prevKeyRef = useRef("");
  const sizeSnapResultRef = useRef<SizeSnapResult | null>(null);
  const isRotatingTransformRef = useRef(false);

  const selectedNodes =
    activePage?.nodes.filter((n) => selectedIds.has(n.id)) || [];
  const selectedNodeMap = new Map<string, Node>(
    selectedNodes.map((n) => [n.id, n]),
  );
  const bounds = getMultiSelectionBoundsWithRotation(selectedNodes);
  const isMulti = selectedNodes.length > 1;
  const isEditingText = editingNodeId !== null;
  const allLocked =
    selectedNodes.length > 0 && selectedNodes.every((n) => n.locked);
  const isImage = selectedNodes[0]?.type === "image";
  const isCornerResizeNode =
    selectedNodes[0]?.type === "image" || selectedNodes[0]?.type === "video";

  // Sync group rotation on selection change (synchronous to avoid 1-frame flicker)
  const key = Array.from(selectedIds).sort().join(",");
  if (prevKeyRef.current !== key) {
    prevKeyRef.current = key;
    let restored = false;
    if (selectedNodes.length > 1) {
      const gid = selectedNodes[0]?.groupId;
      if (gid && selectedNodes.every((n) => n.groupId === gid)) {
        const saved = selectedNodes[0]?.groupRotation;
        if (saved !== undefined && saved !== 0) {
          groupRotRef.current = saved;
          restored = true;
        }
      }
    }
    if (!restored) groupRotRef.current = 0;
  }

  const groupBounds = isMulti
    ? getGroupBoundsInRotatedFrame(selectedNodes, groupRotRef.current)
    : null;

  // Force-update transformer when single node size changes
  useEffect(() => {
    const tr = trRef.current;
    if (!tr || selectedNodes.length !== 1 || isEditingText) return;
    tr.forceUpdate();
    tr.getLayer()?.batchDraw();
  }, [selectedNodes, isEditingText]);

  // Attach transformer to target shape / proxy rect
  useEffect(() => {
    const tr = trRef.current,
      stage = stageRef.current;
    if (!tr || !stage) return;
    if (selectedNodes.length === 0 || isEditingText) {
      tr.nodes([]);
      return;
    }

    if (isMulti) {
      const proxy = proxyRef.current;
      if (proxy) tr.nodes([proxy]);
    } else {
      const selected = selectedNodes[0];
      const shape = stage.findOne(`#shape_${selected.id}`);
      if (shape) {
        if (
          selected.type === "video" &&
          shape.parent &&
          shape.parent !== shape.getLayer()
        ) {
          tr.nodes([shape.parent]);
        } else {
          tr.nodes([shape]);
        }
      }
    }
    tr.getLayer()?.batchDraw();
  }, [selectedNodes, stageRef, selectedIds, isMulti, isEditingText]);

  /* ---- Transform handlers ---- */

  const handleTransformStart = () => {
    isRotatingTransformRef.current = trRef.current?.getActiveAnchor() === "rotater";

    const stage = stageRef.current;
    origStatesRef.current = selectedNodes.map((n) => {
      const shape = stage?.findOne(`#shape_${n.id}`) as Konva.Node | null;
      const target =
        n.type === "video" && shape?.parent && shape.parent !== shape.getLayer()
          ? shape.parent
          : shape;
      return {
        id: n.id,
        type: n.type,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        rotation: n.rotation,
        scaleX: target?.scaleX() ?? 1,
        scaleY: target?.scaleY() ?? 1,
      };
    });

    if (isMulti) {
      const pr = proxyRef.current;
      if (pr) {
        origBoundsRef.current = {
          x: 0,
          y: 0,
          width: pr.width(),
          height: pr.height(),
          centerX: pr.x(),
          centerY: pr.y(),
        };
      }
    } else if (bounds) {
      origBoundsRef.current = {
        ...bounds,
        centerX: bounds.x + bounds.width / 2,
        centerY: bounds.y + bounds.height / 2,
      };
    }
  };

  const handleTransform = () => {
    const stage = stageRef.current;
    if (!stage) return;

    // --- Size snap guides (ทั้ง single & multi) ---
    const snapResult = sizeSnapResultRef.current;
    if (snapResult && (snapResult.snappedWidth || snapResult.snappedHeight)) {
      useSnapGuidesStore.getState().setSizeGuides(snapResult.sizeGuides);
    } else {
      useSnapGuidesStore.getState().setSizeGuides([]);
    }

    if (!isMulti) return; // Single: Konva Transformer handles visual

    const pr = proxyRef.current;
    if (!pr || !origBoundsRef.current) return;

    const positions = computeMultiPositions(
      origStatesRef.current,
      { x: origBoundsRef.current.centerX, y: origBoundsRef.current.centerY },
      groupRotRef.current,
      pr.scaleX(),
      pr.scaleY(),
      pr.rotation(),
      pr.x(),
      pr.y(),
    );
    positions.forEach((p) =>
      setKonvaShape(
        stage,
        p.id,
        p.type,
        p.x,
        p.y,
        p.width,
        p.height,
        p.rotation,
        p.origWidth,
        p.origHeight,
        false,
      ),
    );
    stage.batchDraw();
  };

  const hasHistoryDiff = (updates: Array<{ id: string; oldProps: Partial<Node>; newProps: Partial<Node> }>) =>
    updates.some(
      (u) =>
        u.oldProps.x !== u.newProps.x ||
        u.oldProps.y !== u.newProps.y ||
        u.oldProps.width !== u.newProps.width ||
        u.oldProps.height !== u.newProps.height ||
        u.oldProps.rotation !== u.newProps.rotation ||
        !samePoints(
          (u.oldProps as { points?: number[] }).points,
          (u.newProps as { points?: number[] }).points,
        ),
    );

  const commitTransformHistory = (
    updates: Array<{ id: string; oldProps: Partial<Node>; newProps: Partial<Node> }>,
  ) => {
    if (updates.length === 0 || !hasHistoryDiff(updates)) return;
    const op: TransformOp = {
      type: "transform",
      timestamp: Date.now(),
      updates,
    };
    const { past } = useHistoryStore.getState();
    useHistoryStore.setState({ past: [...past, op], future: [] });
    useDocStore.getState().autoSave();
  };

  const finalizeSingleTransform = (
    stage: Konva.Stage,
    lastSizeSnap: SizeSnapResult | null,
    historyUpdates: Array<{ id: string; oldProps: Partial<Node>; newProps: Partial<Node> }>,
  ) => {
    const node = selectedNodes[0];
    const shape = stage.findOne(`#shape_${node.id}`);
    const orig = origStatesRef.current[0];
    if (!shape || !orig) return;

    if (node.type === "path") {
      const pathNode = node as PathNode;
      const fr = shape.rotation();
      const baked = bakePathGeometry(
        pathNode,
        shape.x(),
        shape.y(),
        fr,
        shape.scaleX(),
        shape.scaleY(),
      );

      shape.scaleX(1);
      shape.scaleY(1);
      shape.x(baked.x);
      shape.y(baked.y);
      shape.rotation(fr);
      shape.width(baked.width);
      shape.height(baked.height);
      shape.offsetX(baked.width / 2);
      shape.offsetY(baked.height / 2);
      (shape as Konva.Line).points(baked.points);

      updateNodes([
        {
          id: node.id,
          changes: {
            x: baked.x,
            y: baked.y,
            width: baked.width,
            height: baked.height,
            rotation: fr,
            points: baked.points,
          } as Partial<Node>,
        },
      ]);
      historyUpdates.push({
        id: node.id,
        oldProps: {
          x: orig.x,
          y: orig.y,
          width: orig.width,
          height: orig.height,
          rotation: orig.rotation,
          points: pathNode.points,
        } as Partial<Node>,
        newProps: {
          x: baked.x,
          y: baked.y,
          width: baked.width,
          height: baked.height,
          rotation: fr,
          points: baked.points,
        } as Partial<Node>,
      });
      return;
    }

    const target =
      node.type === "video" && shape.parent && shape.parent !== shape.getLayer()
        ? shape.parent
        : shape;

    const baseScaleX = Math.max(SCALE_SNAP, Math.abs(orig.scaleX));
    const baseScaleY = Math.max(SCALE_SNAP, Math.abs(orig.scaleY));
    const scaleRatioX = Math.abs(target.scaleX()) / baseScaleX;
    const scaleRatioY = Math.abs(target.scaleY()) / baseScaleY;

    let fw = Math.max(5, Math.abs(orig.width * scaleRatioX));
    let fh = Math.max(5, Math.abs(orig.height * scaleRatioY));

    if (lastSizeSnap) {
      if (lastSizeSnap.snappedWidth) fw = lastSizeSnap.width;
      if (lastSizeSnap.snappedHeight) fh = lastSizeSnap.height;
    }
    let fx = target.x();
    let fy = target.y();
    const fr = target.rotation();

    if (activePage && !isRotatingTransformRef.current) {
      if (node.type === "image" || node.type === "video") {
        const asp = fw / fh;
        if (fw > activePage.width) {
          fw = activePage.width;
          fh = fw / asp;
        }
        if (fh > activePage.height) {
          fh = activePage.height;
          fw = fh * asp;
        }
      } else {
        fw = Math.min(fw, activePage.width);
        fh = Math.min(fh, activePage.height);
      }
      const { halfX, halfY } = rotatedHalfExtents(fw, fh, fr);
      fx = Math.max(halfX, Math.min(activePage.width - halfX, fx));
      fy = Math.max(halfY, Math.min(activePage.height - halfY, fy));
    }

    if (node.type === "video") {
      const parent = shape.parent;
      if (parent && parent !== shape.getLayer()) {
        parent.x(fx);
        parent.y(fy);
        parent.rotation(fr);
        parent.scaleX(1);
        parent.scaleY(1);
        parent.offsetX(fw / 2);
        parent.offsetY(fh / 2);
        shape.width(fw);
        shape.height(fh);
      }
    } else if (node.type === "triangle" || node.type === "pentagon") {
      const base = node.type === "triangle" ? TRI_BASE_SIZE : PENT_BASE_SIZE;
      shape.x(fx);
      shape.y(fy);
      shape.rotation(fr);
      (shape as Konva.RegularPolygon).radius(50);
      shape.offsetX(0);
      shape.offsetY(0);
      shape.scaleX(fw / Math.max(1, base.width));
      shape.scaleY(fh / Math.max(1, base.height));
    } else if (node.type === "ellipse") {
      shape.x(fx);
      shape.y(fy);
      shape.rotation(fr);
      (shape as Konva.Ellipse).radiusX(fw / 2);
      (shape as Konva.Ellipse).radiusY(fh / 2);
      shape.scaleX(1);
      shape.scaleY(1);
    } else {
      shape.x(fx);
      shape.y(fy);
      shape.rotation(fr);
      shape.scaleX(1);
      shape.scaleY(1);
      shape.width(fw);
      shape.height(fh);
      if (shape.offsetX() !== 0) {
        shape.offsetX(fw / 2);
        shape.offsetY(fh / 2);
      }
    }

    updateNodes([
      {
        id: node.id,
        changes: { x: fx, y: fy, width: fw, height: fh, rotation: fr },
      },
    ]);
    historyUpdates.push({
      id: node.id,
      oldProps: {
        x: orig.x,
        y: orig.y,
        width: orig.width,
        height: orig.height,
        rotation: orig.rotation,
      },
      newProps: { x: fx, y: fy, width: fw, height: fh, rotation: fr },
    });
  };

  const finalizeMultiTransform = (
    stage: Konva.Stage,
    historyUpdates: Array<{ id: string; oldProps: Partial<Node>; newProps: Partial<Node> }>,
  ) => {
    const pr = proxyRef.current;
    if (!pr || !origBoundsRef.current) return;

    const proxyRotation = pr.rotation();
    const positions = computeMultiPositions(
      origStatesRef.current,
      {
        x: origBoundsRef.current.centerX,
        y: origBoundsRef.current.centerY,
      },
      groupRotRef.current,
      pr.scaleX(),
      pr.scaleY(),
      proxyRotation,
      pr.x(),
      pr.y(),
    );

    const storeUpdates: Array<{ id: string; changes: Partial<Node> }> = [];
    const rawScaleX = pr.scaleX();
    const rawScaleY = pr.scaleY();
    const isPureRotation =
      Math.abs(rawScaleX - 1) < SCALE_SNAP &&
      Math.abs(rawScaleY - 1) < SCALE_SNAP &&
      Math.abs(proxyRotation - groupRotRef.current) > 0.1;

    positions.forEach((p, i) => {
      let { x: fx, y: fy, width: fw, height: fh } = p;
      const selectedNode = selectedNodeMap.get(p.id);
      if (activePage && !isPureRotation) {
        fw = Math.min(fw, activePage.width);
        fh = Math.min(fh, activePage.height);
        const hw = fw / 2;
        const hh = fh / 2;
        fx = Math.max(hw, Math.min(activePage.width - hw, fx));
        fy = Math.max(hh, Math.min(activePage.height - hh, fy));
      }

      setKonvaShape(
        stage,
        p.id,
        p.type,
        fx,
        fy,
        fw,
        fh,
        p.rotation,
        p.origWidth,
        p.origHeight,
        true,
      );

      let pathPoints: number[] | undefined;
      if (selectedNode?.type === "path") {
        const pathNode = selectedNode as PathNode;
        const sx = (Math.sign(rawScaleX) || 1) * (fw / Math.max(1, p.origWidth));
        const sy = (Math.sign(rawScaleY) || 1) * (fh / Math.max(1, p.origHeight));
        const baked = bakePathGeometry(pathNode, fx, fy, p.rotation, sx, sy);
        fx = baked.x;
        fy = baked.y;
        fw = baked.width;
        fh = baked.height;
        pathPoints = baked.points;

        const pathShape = stage.findOne(`#shape_${p.id}`) as Konva.Line | null;
        if (pathShape) {
          pathShape.x(fx);
          pathShape.y(fy);
          pathShape.rotation(p.rotation);
          pathShape.width(fw);
          pathShape.height(fh);
          pathShape.offsetX(fw / 2);
          pathShape.offsetY(fh / 2);
          pathShape.points(pathPoints);
          pathShape.scaleX(1);
          pathShape.scaleY(1);
        }
      }

      storeUpdates.push({
        id: p.id,
        changes: {
          x: fx,
          y: fy,
          width: fw,
          height: fh,
          rotation: p.rotation,
          ...(pathPoints ? { points: pathPoints } : {}),
        },
      });

      const orig = origStatesRef.current[i];
      historyUpdates.push({
        id: p.id,
        oldProps: {
          x: orig.x,
          y: orig.y,
          width: orig.width,
          height: orig.height,
          rotation: orig.rotation,
          ...(selectedNode?.type === "path"
            ? { points: (selectedNode as PathNode).points }
            : {}),
        },
        newProps: {
          x: fx,
          y: fy,
          width: fw,
          height: fh,
          rotation: p.rotation,
          ...(pathPoints ? { points: pathPoints } : {}),
        },
      });
    });

    if (storeUpdates.length > 0) updateNodes(storeUpdates);

    groupRotRef.current = proxyRotation;
    const gid = selectedNodes[0]?.groupId;
    const allSameGroup = gid && selectedNodes.every((n) => n.groupId === gid);
    if (allSameGroup) {
      updateNodes(
        selectedNodes.map((n) => ({
          id: n.id,
          changes: {
            groupRotation: proxyRotation || undefined,
          } as Partial<Node>,
        })),
      );
    }

    pr.scaleX(1);
    pr.scaleY(1);
    const currentDoc = useDocStore.getState().doc;
    const currentPage =
      currentDoc?.pages.find((p) => p.id === currentDoc.activePageId) ??
      currentDoc?.pages[0] ??
      null;
    const freshNodes = currentPage?.nodes.filter((n) => selectedIds.has(n.id)) || [];
    const newBounds = getGroupBoundsInRotatedFrame(freshNodes, groupRotRef.current);
    if (newBounds) {
      pr.x(newBounds.centerX);
      pr.y(newBounds.centerY);
      pr.width(newBounds.width);
      pr.height(newBounds.height);
      pr.offsetX(newBounds.width / 2);
      pr.offsetY(newBounds.height / 2);
      pr.rotation(groupRotRef.current);
    }
  };

  const multiBoundBoxFunc = (
    oldBox: { x: number; y: number; width: number; height: number; rotation: number },
    newBox: { x: number; y: number; width: number; height: number; rotation: number },
  ) => {
    const activeAnchor = trRef.current?.getActiveAnchor();
    if (activeAnchor === "rotater") return newBox;
    if (oldBox.width * newBox.width < 0 || oldBox.height * newBox.height < 0)
      return oldBox;
    if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10)
      return oldBox;

    const p = proxyRef.current;
    const isRot = p
      ? Math.abs(p.scaleX() - 1) < 0.001 && Math.abs(p.scaleY() - 1) < 0.001
      : Math.abs(oldBox.width - newBox.width) < 1 &&
        Math.abs(oldBox.height - newBox.height) < 1;
    if (isRot) return newBox;

    const proxyRot = p?.rotation() ?? 0;
    if (Math.abs(proxyRot % 360) > 0.01) return newBox;

    if (!activePage) return newBox;
    const db = docScreenBounds(activePage);
    const c = clampEdges(newBox, db);
    return c.width < 10 || c.height < 10 ? oldBox : { ...newBox, ...c };
  };

  const singleBoundBoxFunc = (
    oldBox: { x: number; y: number; width: number; height: number; rotation: number },
    newBox: { x: number; y: number; width: number; height: number; rotation: number },
  ) => {
    const activeAnchor = trRef.current?.getActiveAnchor();
    if (activeAnchor === "rotater") {
      sizeSnapResultRef.current = null;
      return newBox;
    }
    if (oldBox.width * newBox.width < 0 || oldBox.height * newBox.height < 0)
      return oldBox;
    if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5)
      return oldBox;
    if (!activePage) return newBox;

    const isRot =
      Math.abs(oldBox.width - newBox.width) < 1 &&
      Math.abs(oldBox.height - newBox.height) < 1;
    if (isRot) {
      sizeSnapResultRef.current = null;
      return newBox;
    }

    const z = viewport.zoom;
    const worldW = Math.abs(newBox.width) / z;
    const worldH = Math.abs(newBox.height) / z;
    const widthChanged = Math.abs(Math.abs(newBox.width) - Math.abs(oldBox.width)) > 0.5;
    const heightChanged = Math.abs(Math.abs(newBox.height) - Math.abs(oldBox.height)) > 0.5;

    const otherNodes = activePage.nodes.filter((n) => !selectedIds.has(n.id) && n.visible);
    const sizeSnap = snapResizeSize(worldW, worldH, selectedIds, otherNodes);
    sizeSnapResultRef.current = sizeSnap;

    if (isCornerResizeNode) {
      const orig = origStatesRef.current[0];
      const aspect = orig
        ? orig.width / orig.height
        : Math.abs(oldBox.width) / Math.abs(oldBox.height);

      if (sizeSnap.snappedWidth && widthChanged) {
        const snappedScreenW = sizeSnap.width * z;
        const snappedScreenH = snappedScreenW / aspect;
        const signW = Math.sign(newBox.width) || 1;
        const signH = Math.sign(newBox.height) || 1;
        const leftFixed = Math.abs(oldBox.x - newBox.x) < 2;
        const topFixed = Math.abs(oldBox.y - newBox.y) < 2;

        if (!leftFixed) newBox.x = newBox.x + newBox.width - signW * snappedScreenW;
        newBox.width = signW * snappedScreenW;

        if (!topFixed) newBox.y = newBox.y + newBox.height - signH * snappedScreenH;
        newBox.height = signH * snappedScreenH;
      } else if (sizeSnap.snappedHeight && heightChanged) {
        const snappedScreenH = sizeSnap.height * z;
        const snappedScreenW = snappedScreenH * aspect;
        const signW = Math.sign(newBox.width) || 1;
        const signH = Math.sign(newBox.height) || 1;
        const leftFixed = Math.abs(oldBox.x - newBox.x) < 2;
        const topFixed = Math.abs(oldBox.y - newBox.y) < 2;

        if (!leftFixed) newBox.x = newBox.x + newBox.width - signW * snappedScreenW;
        newBox.width = signW * snappedScreenW;

        if (!topFixed) newBox.y = newBox.y + newBox.height - signH * snappedScreenH;
        newBox.height = signH * snappedScreenH;
      }
    } else {
      if (sizeSnap.snappedWidth && widthChanged) {
        const snappedScreenW = sizeSnap.width * z;
        const signW = Math.sign(newBox.width) || 1;
        const targetW = signW * snappedScreenW;
        const leftFixed = Math.abs(oldBox.x - newBox.x) < 2;
        if (!leftFixed) newBox.x = newBox.x + newBox.width - targetW;
        newBox.width = targetW;
      }

      if (sizeSnap.snappedHeight && heightChanged) {
        const snappedScreenH = sizeSnap.height * z;
        const signH = Math.sign(newBox.height) || 1;
        const targetH = signH * snappedScreenH;
        const topFixed = Math.abs(oldBox.y - newBox.y) < 2;
        if (!topFixed) newBox.y = newBox.y + newBox.height - targetH;
        newBox.height = targetH;
      }
    }

    const nodeRot = selectedNodes[0]?.rotation ?? 0;
    if (Math.abs(nodeRot % 360) > 0.01) return newBox;

    const db = docScreenBounds(activePage);
    if (!isCornerResizeNode) {
      const c = clampEdges(newBox, db);
      if (c.width < 5 || c.height < 5) return oldBox;
      return { ...newBox, ...c };
    }
    return newBox;
  };

  const handleTransformEnd = () => {
    const lastSizeSnap = sizeSnapResultRef.current;
    useSnapGuidesStore.getState().setSizeGuides([]);
    sizeSnapResultRef.current = null;

    const stage = stageRef.current;
    if (!stage) return;

    const historyUpdates: Array<{ id: string; oldProps: Partial<Node>; newProps: Partial<Node> }> = [];

    if (!isMulti && selectedNodes.length === 1) {
      finalizeSingleTransform(stage, lastSizeSnap, historyUpdates);
    } else {
      finalizeMultiTransform(stage, historyUpdates);
    }

    commitTransformHistory(historyUpdates);
    origStatesRef.current = [];
    origBoundsRef.current = null;
    isRotatingTransformRef.current = false;
    trRef.current?.forceUpdate();
  };

  /* ---- Render ---- */

  if (selectedNodes.length === 0 || isEditingText) {
    return <Transformer ref={trRef} />;
  }

  if (allLocked) {
    return (
      <Transformer
        ref={trRef}
        enabledAnchors={[]}
        rotateEnabled={false}
        borderStroke="#ff4444"
        borderDash={[4, 4]}
      />
    );
  }

  // Multi-selection with rotated proxy rect
  if (isMulti && groupBounds) {
    return (
      <>
        <Rect
          ref={proxyRef}
          x={groupBounds.centerX}
          y={groupBounds.centerY}
          width={groupBounds.width}
          height={groupBounds.height}
          offsetX={groupBounds.width / 2}
          offsetY={groupBounds.height / 2}
          rotation={groupRotRef.current}
          fill="transparent"
          stroke="#0066ff"
          strokeWidth={1 / viewport.zoom}
          dash={[5 / viewport.zoom, 5 / viewport.zoom]}
          listening={false}
        />
        <Transformer
          ref={trRef}
          onTransformStart={handleTransformStart}
          onTransform={handleTransform}
          onTransformEnd={handleTransformEnd}
          flipEnabled={false}
          rotationSnaps={ROTATION_SNAPS}
          rotationSnapTolerance={5}
          keepRatio={false}
          enabledAnchors={[...ALL_ANCHORS]}
          boundBoxFunc={multiBoundBoxFunc}
        />
      </>
    );
  }

  // Single selection
  return (
    <Transformer
      ref={trRef}
      onTransformStart={handleTransformStart}
      onTransform={handleTransform}
      onTransformEnd={handleTransformEnd}
      flipEnabled={false}
      rotationSnaps={ROTATION_SNAPS}
      rotationSnapTolerance={5}
      keepRatio={isCornerResizeNode}
      enabledAnchors={isCornerResizeNode ? [...CORNER_ANCHORS] : [...ALL_ANCHORS]}
      boundBoxFunc={singleBoundBoxFunc}
    />
  );
}
