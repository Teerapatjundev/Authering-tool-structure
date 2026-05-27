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
import {
  snapResizeSize,
  SizeSnapResult,
  snapResizeEdges,
  ResizeEdgeSnapResult,
} from "../../core/geometry/snap";
import { useSnapGuidesStore } from "../../stores/snapGuidesStore";
import { TRI_BASE_SIZE, PENT_BASE_SIZE } from "./polygonGeometry";

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

interface SelectionControllerProps {
  stageRef: React.RefObject<Konva.Stage | null>;
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

/**
 * วัดความสูงของข้อความเมื่อ word-wrap ที่ความกว้างที่กำหนด
 * ใช้สำหรับคำนวณ height ของ text node เมื่อ resize ให้แคบลง
 */
function measureWrappedTextHeight(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontStyle: string | undefined,
  availableWidth: number,
  padding: number = 0,
): number {
  if (typeof document === "undefined") return Math.max(fontSize * 1.4, 24);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return Math.max(fontSize * 1.4, 24);
  const weight = fontStyle?.includes("bold") ? "bold" : "normal";
  const italic = fontStyle?.includes("italic") ? "italic" : "normal";
  ctx.font = `${italic} ${weight} ${fontSize}px ${fontFamily}`.trim();
  const innerWidth = Math.max(1, availableWidth - 2 * padding);
  const lineHeight = fontSize * 1.2;
  let totalLines = 0;
  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      totalLines++;
      continue;
    }
    const words = paragraph.split(" ");
    let currentLine = "";
    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(candidate).width > innerWidth && currentLine) {
        totalLines++;
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }
    totalLines++;
  }
  return Math.max(
    totalLines * lineHeight + 2 * padding + 10,
    fontSize * 1.5 + 2 * padding,
  );
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

  if (type === "video" || type === "accordion") {
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
  const resizeEdgeSnapRef = useRef<ResizeEdgeSnapResult | null>(null);
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
  const isPracticeSelection = selectedNodes.some((n) => !!n.practice);
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
          (selected.type === "video" || selected.type === "accordion") &&
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
    isRotatingTransformRef.current =
      trRef.current?.getActiveAnchor() === "rotater";

    const stage = stageRef.current;
    origStatesRef.current = selectedNodes.map((n) => {
      const shape = stage?.findOne(`#shape_${n.id}`) as Konva.Node | null;
      const target =
        (n.type === "video" || n.type === "accordion") &&
        shape?.parent &&
        shape.parent !== shape.getLayer()
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

    // --- Edge snap guides (single resize only) ---
    const edgeSnap = resizeEdgeSnapRef.current;
    if (
      edgeSnap &&
      (edgeSnap.snappedLeft ||
        edgeSnap.snappedRight ||
        edgeSnap.snappedTop ||
        edgeSnap.snappedBottom)
    ) {
      useSnapGuidesStore.getState().setGuides(edgeSnap.guides);
    } else {
      useSnapGuidesStore.getState().setGuides([]);
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

  const hasHistoryDiff = (
    updates: Array<{
      id: string;
      oldProps: Partial<Node>;
      newProps: Partial<Node>;
    }>,
  ) =>
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
    updates: Array<{
      id: string;
      oldProps: Partial<Node>;
      newProps: Partial<Node>;
    }>,
  ) => {
    if (updates.length === 0 || !hasHistoryDiff(updates)) return;

    const { doc } = useDocStore.getState();
    if (!doc) return;

    const op: TransformOp = {
      type: "transform",
      timestamp: Date.now(),
      pageId: doc.activePageId,
      updates,
    };
    const { past } = useHistoryStore.getState();
    useHistoryStore.setState({ past: [...past, op], future: [] });
    useDocStore.getState().autoSave();
  };

  const finalizeSingleTransform = (
    stage: Konva.Stage,
    lastSizeSnap: SizeSnapResult | null,
    historyUpdates: Array<{
      id: string;
      oldProps: Partial<Node>;
      newProps: Partial<Node>;
    }>,
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
      (node.type === "video" || node.type === "accordion") &&
      shape.parent &&
      shape.parent !== shape.getLayer()
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

    // For text/textlink nodes: recompute height from word-wrapped content at new width
    if (
      !isRotatingTransformRef.current &&
      (node.type === "text" || node.type === "textlink")
    ) {
      const tn = node as {
        text: string;
        fontSize: number;
        fontFamily: string;
        fontStyle?: string;
        practice?: { type?: string };
      };
      if (tn.text) {
        const pad = tn.practice?.type === "fill-in-the-blank" ? 8 : 0;
        fh = measureWrappedTextHeight(
          tn.text,
          tn.fontSize,
          tn.fontFamily,
          tn.fontStyle,
          fw,
          pad,
        );
      }
    }

    if (node.type === "video" || node.type === "accordion") {
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

    // Fill-in-the-blank: sync sibling (rect <-> text) to the same bounds
    if (
      activePage &&
      node.practice?.type === "fill-in-the-blank" &&
      node.practice?.id
    ) {
      const practiceId = node.practice.id;
      const siblingNodes = activePage.nodes.filter(
        (n) => n.id !== node.id && n.practice?.id === practiceId,
      );
      if (siblingNodes.length > 0) {
        const sibUpdates = siblingNodes.map((sib) => ({
          id: sib.id,
          changes: { x: fx, y: fy, width: fw, height: fh } as Partial<Node>,
        }));
        updateNodes(sibUpdates);
        for (const sib of siblingNodes) {
          historyUpdates.push({
            id: sib.id,
            oldProps: {
              x: sib.x,
              y: sib.y,
              width: sib.width,
              height: sib.height,
            },
            newProps: { x: fx, y: fy, width: fw, height: fh },
          });
        }
      }
    }

    // Choice parent/child rotation sync:
    // If the selected node is a Choice primary, rotate all children around the parent center.
    if (
      activePage &&
      node.practice?.type === "choice" &&
      node.practice?.containerRole === "primary"
    ) {
      const deltaDeg = fr - (orig.rotation || 0);
      if (Math.abs(deltaDeg) > 0.001) {
        const rad = (deltaDeg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const oldCx = orig.x;
        const oldCy = orig.y;
        const newCx = fx;
        const newCy = fy;

        const children = activePage.nodes.filter(
          (n: any) => n.visible && n.parentId === node.id,
        );

        if (children.length > 0) {
          const childUpdates: Array<{ id: string; changes: Partial<Node> }> =
            [];

          for (const child of children) {
            const relX = child.x - oldCx;
            const relY = child.y - oldCy;
            const rotX = relX * cos - relY * sin;
            const rotY = relX * sin + relY * cos;
            const nextX = newCx + rotX;
            const nextY = newCy + rotY;
            const nextRot = (child.rotation || 0) + deltaDeg;

            childUpdates.push({
              id: child.id,
              changes: { x: nextX, y: nextY, rotation: nextRot },
            });

            historyUpdates.push({
              id: child.id,
              oldProps: { x: child.x, y: child.y, rotation: child.rotation },
              newProps: { x: nextX, y: nextY, rotation: nextRot },
            });
          }

          if (childUpdates.length > 0) updateNodes(childUpdates);
        }
      }
    }
  };

  const finalizeMultiTransform = (
    stage: Konva.Stage,
    historyUpdates: Array<{
      id: string;
      oldProps: Partial<Node>;
      newProps: Partial<Node>;
    }>,
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
        const sx =
          (Math.sign(rawScaleX) || 1) * (fw / Math.max(1, p.origWidth));
        const sy =
          (Math.sign(rawScaleY) || 1) * (fh / Math.max(1, p.origHeight));
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
    const freshNodes =
      currentPage?.nodes.filter((n) => selectedIds.has(n.id)) || [];
    const newBounds = getGroupBoundsInRotatedFrame(
      freshNodes,
      groupRotRef.current,
    );
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
    oldBox: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    },
    newBox: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    },
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
    oldBox: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    },
    newBox: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    },
  ) => {
    const activeAnchor = trRef.current?.getActiveAnchor();
    if (activeAnchor === "rotater") {
      sizeSnapResultRef.current = null;
      resizeEdgeSnapRef.current = null;
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
      resizeEdgeSnapRef.current = null;
      return newBox;
    }

    const z = viewport.zoom;
    const worldW = Math.abs(newBox.width) / z;
    const worldH = Math.abs(newBox.height) / z;
    const widthChanged =
      Math.abs(Math.abs(newBox.width) - Math.abs(oldBox.width)) > 0.5;
    const heightChanged =
      Math.abs(Math.abs(newBox.height) - Math.abs(oldBox.height)) > 0.5;

    const otherNodes = activePage.nodes.filter(
      (n) => !selectedIds.has(n.id) && n.visible,
    );
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

        if (!leftFixed)
          newBox.x = newBox.x + newBox.width - signW * snappedScreenW;
        newBox.width = signW * snappedScreenW;

        if (!topFixed)
          newBox.y = newBox.y + newBox.height - signH * snappedScreenH;
        newBox.height = signH * snappedScreenH;
      } else if (sizeSnap.snappedHeight && heightChanged) {
        const snappedScreenH = sizeSnap.height * z;
        const snappedScreenW = snappedScreenH * aspect;
        const signW = Math.sign(newBox.width) || 1;
        const signH = Math.sign(newBox.height) || 1;
        const leftFixed = Math.abs(oldBox.x - newBox.x) < 2;
        const topFixed = Math.abs(oldBox.y - newBox.y) < 2;

        if (!leftFixed)
          newBox.x = newBox.x + newBox.width - signW * snappedScreenW;
        newBox.width = signW * snappedScreenW;

        if (!topFixed)
          newBox.y = newBox.y + newBox.height - signH * snappedScreenH;
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

    // --- Edge snap during resize (Canva-style position alignment) ---
    // Only for non-rotated, non-corner-resize nodes
    const resizingNode = selectedNodes[0];
    const resizingNodeRot = resizingNode?.rotation ?? 0;
    if (!isCornerResizeNode && Math.abs(resizingNodeRot % 360) < 0.01) {
      const vx = viewport.x;
      const vy = viewport.y;
      // Convert newBox (screen space) to world space
      const worldLeft = (newBox.x - vx) / z;
      const worldTop = (newBox.y - vy) / z;
      const worldRight = worldLeft + Math.abs(newBox.width) / z;
      const worldBottom = worldTop + Math.abs(newBox.height) / z;
      const anchor = activeAnchor ?? "";
      // Determine which edges are moving based on the active anchor
      const movingLeft: number | null = anchor.includes("left")
        ? worldLeft
        : null;
      const movingRight: number | null = anchor.includes("right")
        ? worldRight
        : null;
      const movingTop: number | null = anchor.includes("top") ? worldTop : null;
      const movingBottom: number | null = anchor.includes("bottom")
        ? worldBottom
        : null;

      if (
        movingLeft !== null ||
        movingRight !== null ||
        movingTop !== null ||
        movingBottom !== null
      ) {
        const otherNodes = activePage.nodes.filter(
          (n) => !selectedIds.has(n.id) && n.visible,
        );
        const edgeSnap = snapResizeEdges(
          movingLeft,
          movingRight,
          movingTop,
          movingBottom,
          {
            left: worldLeft,
            top: worldTop,
            right: worldRight,
            bottom: worldBottom,
          },
          otherNodes,
          selectedIds,
          activePage.width,
          activePage.height,
        );
        resizeEdgeSnapRef.current = edgeSnap;
        if (edgeSnap.snappedLeft) {
          const snappedScreenLeft = edgeSnap.left * z + vx;
          newBox.width += newBox.x - snappedScreenLeft;
          newBox.x = snappedScreenLeft;
        }
        if (edgeSnap.snappedRight) {
          newBox.width = edgeSnap.right * z + vx - newBox.x;
        }
        if (edgeSnap.snappedTop) {
          const snappedScreenTop = edgeSnap.top * z + vy;
          newBox.height += newBox.y - snappedScreenTop;
          newBox.y = snappedScreenTop;
        }
        if (edgeSnap.snappedBottom) {
          newBox.height = edgeSnap.bottom * z + vy - newBox.y;
        }
      } else {
        resizeEdgeSnapRef.current = null;
      }
    } else {
      resizeEdgeSnapRef.current = null;
    }

    const selected = selectedNodes[0];
    const isContainerPrimary =
      (selected?.practice?.type === "choice" ||
        selected?.practice?.type === "connection" ||
        selected?.practice?.type === "sequence-ordering") &&
      selected?.practice?.containerRole === "primary";

    const containerParent =
      activePage && (selected as any)?.parentId
        ? activePage.nodes.find((n: any) => n.id === (selected as any).parentId)
        : null;
    const isContainerChild =
      !!containerParent &&
      (containerParent.practice?.type === "choice" ||
        containerParent.practice?.type === "connection" ||
        containerParent.practice?.type === "sequence-ordering") &&
      containerParent.practice?.containerRole === "primary";

    const nodeRot = selected?.rotation ?? 0;
    // For most nodes, skip edge clamping when rotated.
    // For container primary (Choice/Connection/Sequence), we still enforce parent/child boundary even when rotated.
    if (
      !isContainerPrimary &&
      !isContainerChild &&
      Math.abs(nodeRot % 360) > 0.01
    )
      return newBox;

    // Container parent/child boundary:
    // Parent (primary) must always contain children. When shrinking, it stops exactly at
    // children's edges (left/right/top/bottom) in screen space. Works even if children are rotated.
    if (isContainerPrimary && activePage) {
      const children = activePage.nodes.filter(
        (n: any) => n.visible && n.parentId === selected.id,
      );

      if (children.length > 0) {
        const z = viewport.zoom;
        const vx = viewport.x;
        const vy = viewport.y;

        let childMinL = Number.POSITIVE_INFINITY;
        let childMinT = Number.POSITIVE_INFINITY;
        let childMaxR = Number.NEGATIVE_INFINITY;
        let childMaxB = Number.NEGATIVE_INFINITY;

        for (const c of children) {
          const rot = c.rotation ?? 0;
          const { halfX, halfY } = rotatedHalfExtents(c.width, c.height, rot);
          const l = (c.x - halfX) * z + vx;
          const t = (c.y - halfY) * z + vy;
          const r = (c.x + halfX) * z + vx;
          const b = (c.y + halfY) * z + vy;
          if (l < childMinL) childMinL = l;
          if (t < childMinT) childMinT = t;
          if (r > childMaxR) childMaxR = r;
          if (b > childMaxB) childMaxB = b;
        }

        let left = newBox.x;
        let top = newBox.y;
        let right = newBox.x + newBox.width;
        let bottom = newBox.y + newBox.height;

        // Prevent parent from crossing children's bounds.
        if (left > childMinL) left = childMinL;
        if (top > childMinT) top = childMinT;
        if (right < childMaxR) right = childMaxR;
        if (bottom < childMaxB) bottom = childMaxB;

        newBox.x = left;
        newBox.y = top;
        newBox.width = right - left;
        newBox.height = bottom - top;
      }
    }

    // Container child boundary:
    // Child (sub) must stay within parent (primary). When expanding, it stops exactly at
    // parent's edges (left/right/top/bottom) in screen space.
    if (isContainerChild && activePage && containerParent) {
      const z = viewport.zoom;
      const vx = viewport.x;
      const vy = viewport.y;

      const parentRot = containerParent.rotation ?? 0;
      const { halfX: pHalfX, halfY: pHalfY } = rotatedHalfExtents(
        containerParent.width,
        containerParent.height,
        parentRot,
      );

      const parentL = (containerParent.x - pHalfX) * z + vx;
      const parentT = (containerParent.y - pHalfY) * z + vy;
      const parentR = (containerParent.x + pHalfX) * z + vx;
      const parentB = (containerParent.y + pHalfY) * z + vy;

      const signW = Math.sign(newBox.width) || 1;
      const signH = Math.sign(newBox.height) || 1;

      let left = signW > 0 ? newBox.x : newBox.x + newBox.width;
      let right = signW > 0 ? newBox.x + newBox.width : newBox.x;
      let top = signH > 0 ? newBox.y : newBox.y + newBox.height;
      let bottom = signH > 0 ? newBox.y + newBox.height : newBox.y;

      if (left < parentL) left = parentL;
      if (top < parentT) top = parentT;
      if (right > parentR) right = parentR;
      if (bottom > parentB) bottom = parentB;

      const absW = Math.max(0, right - left);
      const absH = Math.max(0, bottom - top);
      if (absW < 5 || absH < 5) return oldBox;

      newBox.x = signW > 0 ? left : right;
      newBox.y = signH > 0 ? top : bottom;
      newBox.width = signW * absW;
      newBox.height = signH * absH;
    }

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
    useSnapGuidesStore.getState().setGuides([]);
    sizeSnapResultRef.current = null;
    resizeEdgeSnapRef.current = null;

    const stage = stageRef.current;
    if (!stage) return;

    const historyUpdates: Array<{
      id: string;
      oldProps: Partial<Node>;
      newProps: Partial<Node>;
    }> = [];

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
          rotateEnabled={!isPracticeSelection}
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
      rotateEnabled={!isPracticeSelection}
      keepRatio={isCornerResizeNode}
      enabledAnchors={
        isCornerResizeNode ? [...CORNER_ANCHORS] : [...ALL_ANCHORS]
      }
      boundBoxFunc={singleBoundBoxFunc}
    />
  );
}
