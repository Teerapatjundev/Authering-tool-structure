/** Selection Controller — Transform handles for single & multi-selection (Canva-style) */
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
import { Node, NodeType } from "../../core/doc/types";
import {
  getMultiSelectionBoundsWithRotation,
  getGroupBoundsInRotatedFrame,
} from "../../core/geometry/bounds";
import { snapResizeSize, SizeSnapResult } from "../../core/geometry/snap";
import { useSnapGuidesStore } from "../../stores/snapGuidesStore";

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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SelectionController({ stageRef }: SelectionControllerProps) {
  const { selectedIds } = useSelectionStore();
  const { doc, updateNodes } = useDocStore();
  const { viewport } = useViewStore();
  const { editingNodeId } = useTextEditStore();

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

  const selectedNodes = doc?.nodes.filter((n) => selectedIds.has(n.id)) || [];
  const bounds = getMultiSelectionBoundsWithRotation(selectedNodes);
  const isMulti = selectedNodes.length > 1;
  const isEditingText = editingNodeId !== null;
  const allLocked =
    selectedNodes.length > 0 && selectedNodes.every((n) => n.locked);

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
      const shape = stage.findOne(`#shape_${selectedNodes[0].id}`);
      if (shape) tr.nodes([shape]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedNodes, stageRef, selectedIds, isMulti, isEditingText]);

  /* ---- Transform handlers ---- */

  const handleTransformStart = () => {
    origStatesRef.current = selectedNodes.map((n) => ({
      id: n.id,
      type: n.type,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      rotation: n.rotation,
    }));

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

  const handleTransformEnd = () => {
    // Read size snap result BEFORE clearing
    const lastSizeSnap = sizeSnapResultRef.current;

    // Clear size snap guides
    useSnapGuidesStore.getState().setSizeGuides([]);
    sizeSnapResultRef.current = null;

    const stage = stageRef.current;
    if (!stage) return;

    const historyUpdates: Array<{
      id: string;
      oldProps: Partial<Node>;
      newProps: Partial<Node>;
    }> = [];

    if (!isMulti && selectedNodes.length === 1) {
      /* --- Single selection --- */
      const node = selectedNodes[0];
      const shape = stage.findOne(`#shape_${node.id}`);
      const orig = origStatesRef.current[0];

      if (shape && orig) {
        let fw = Math.max(5, Math.abs(shape.width() * shape.scaleX()));
        let fh = Math.max(5, Math.abs(shape.height() * shape.scaleY()));

        // Apply exact snapped dimensions (fix floating-point drift from Konva scale)
        if (lastSizeSnap) {
          if (lastSizeSnap.snappedWidth) fw = lastSizeSnap.width;
          if (lastSizeSnap.snappedHeight) fh = lastSizeSnap.height;
        }
        let fx = shape.x(),
          fy = shape.y();
        const fr = shape.rotation();

        // Clamp to document bounds
        if (doc) {
          if (node.type === "image") {
            const asp = fw / fh;
            if (fw > doc.width) {
              fw = doc.width;
              fh = fw / asp;
            }
            if (fh > doc.height) {
              fh = doc.height;
              fw = fh * asp;
            }
          } else {
            fw = Math.min(fw, doc.width);
            fh = Math.min(fh, doc.height);
          }
          const hw = fw / 2,
            hh = fh / 2;
          fx = Math.max(hw, Math.min(doc.width - hw, fx));
          fy = Math.max(hh, Math.min(doc.height - hh, fy));
        }

        // Reset scale & apply final dimensions
        shape.scaleX(1);
        shape.scaleY(1);
        shape.x(fx);
        shape.y(fy);
        shape.width(fw);
        shape.height(fh);
        if (shape.offsetX() !== 0) {
          shape.offsetX(fw / 2);
          shape.offsetY(fh / 2);
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
      }
    } else {
      /* --- Multi selection --- */
      const pr = proxyRef.current;
      if (pr && origBoundsRef.current) {
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

        positions.forEach((p, i) => {
          let { x: fx, y: fy, width: fw, height: fh } = p;
          if (doc) {
            fw = Math.min(fw, doc.width);
            fh = Math.min(fh, doc.height);
            const hw = fw / 2,
              hh = fh / 2;
            fx = Math.max(hw, Math.min(doc.width - hw, fx));
            fy = Math.max(hh, Math.min(doc.height - hh, fy));
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
          storeUpdates.push({
            id: p.id,
            changes: {
              x: fx,
              y: fy,
              width: fw,
              height: fh,
              rotation: p.rotation,
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
            },
            newProps: {
              x: fx,
              y: fy,
              width: fw,
              height: fh,
              rotation: p.rotation,
            },
          });
        });

        if (storeUpdates.length > 0) updateNodes(storeUpdates);

        // Persist group rotation (Canva-style tilted frame)
        groupRotRef.current = proxyRotation;
        const gid = selectedNodes[0]?.groupId;
        const allSameGroup =
          gid && selectedNodes.every((n) => n.groupId === gid);
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

        // Reset proxy rect with fresh bounds
        pr.scaleX(1);
        pr.scaleY(1);
        const freshNodes =
          useDocStore
            .getState()
            .doc?.nodes.filter((n) => selectedIds.has(n.id)) || [];
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
      }
    }

    // Commit history
    if (
      historyUpdates.length > 0 &&
      historyUpdates.some(
        (u) =>
          u.oldProps.x !== u.newProps.x ||
          u.oldProps.y !== u.newProps.y ||
          u.oldProps.width !== u.newProps.width ||
          u.oldProps.height !== u.newProps.height ||
          u.oldProps.rotation !== u.newProps.rotation,
      )
    ) {
      const op: TransformOp = {
        type: "transform",
        timestamp: Date.now(),
        updates: historyUpdates,
      };
      const { past } = useHistoryStore.getState();
      useHistoryStore.setState({ past: [...past, op], future: [] });
      useDocStore.getState().autoSave();
    }

    origStatesRef.current = [];
    origBoundsRef.current = null;
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
          rotationSnaps={ROTATION_SNAPS}
          rotationSnapTolerance={5}
          keepRatio={false}
          enabledAnchors={[...ALL_ANCHORS]}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10)
              return oldBox;
            // Detect rotation via proxy scale (AABB changes size when rotated even without resize)
            const p = proxyRef.current;
            const isRot = p
              ? Math.abs(p.scaleX() - 1) < 0.001 &&
                Math.abs(p.scaleY() - 1) < 0.001
              : Math.abs(oldBox.width - newBox.width) < 1 &&
                Math.abs(oldBox.height - newBox.height) < 1;
            if (isRot) return newBox;
            if (!doc) return newBox;
            const db = docScreenBounds(doc);
            const c = clampEdges(newBox, db);
            return c.width < 10 || c.height < 10 ? oldBox : { ...newBox, ...c };
          }}
        />
      </>
    );
  }

  // Single selection
  const isImage = selectedNodes[0]?.type === "image";
  return (
    <Transformer
      ref={trRef}
      onTransformStart={handleTransformStart}
      onTransform={handleTransform}
      onTransformEnd={handleTransformEnd}
      rotationSnaps={ROTATION_SNAPS}
      rotationSnapTolerance={5}
      keepRatio={isImage}
      enabledAnchors={isImage ? [...CORNER_ANCHORS] : [...ALL_ANCHORS]}
      boundBoxFunc={(oldBox, newBox) => {
        if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5)
          return oldBox;
        if (!doc) return newBox;
        const isRot =
          Math.abs(oldBox.width - newBox.width) < 1 &&
          Math.abs(oldBox.height - newBox.height) < 1;
        if (isRot) {
          sizeSnapResultRef.current = null;
          return newBox;
        }

        // --- Size snap (Canva-style: ดูดติดเมื่อขนาดเท่ากัน) ---
        {
          const z = viewport.zoom;
          const worldW = Math.abs(newBox.width) / z;
          const worldH = Math.abs(newBox.height) / z;
          const widthChanged =
            Math.abs(Math.abs(newBox.width) - Math.abs(oldBox.width)) > 0.5;
          const heightChanged =
            Math.abs(Math.abs(newBox.height) - Math.abs(oldBox.height)) > 0.5;

          const otherNodes = doc.nodes.filter(
            (n) => !selectedIds.has(n.id) && n.visible,
          );
          const sizeSnap = snapResizeSize(
            worldW,
            worldH,
            selectedIds,
            otherNodes,
          );
          sizeSnapResultRef.current = sizeSnap;

          if (isImage) {
            // keepRatio: snap หนึ่ง dimension แล้ว derive อีกด้านตาม aspect ratio
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

              if (!leftFixed) {
                newBox.x =
                  newBox.x + newBox.width - signW * snappedScreenW;
              }
              newBox.width = signW * snappedScreenW;

              if (!topFixed) {
                newBox.y =
                  newBox.y + newBox.height - signH * snappedScreenH;
              }
              newBox.height = signH * snappedScreenH;
            } else if (sizeSnap.snappedHeight && heightChanged) {
              const snappedScreenH = sizeSnap.height * z;
              const snappedScreenW = snappedScreenH * aspect;
              const signW = Math.sign(newBox.width) || 1;
              const signH = Math.sign(newBox.height) || 1;
              const leftFixed = Math.abs(oldBox.x - newBox.x) < 2;
              const topFixed = Math.abs(oldBox.y - newBox.y) < 2;

              if (!leftFixed) {
                newBox.x =
                  newBox.x + newBox.width - signW * snappedScreenW;
              }
              newBox.width = signW * snappedScreenW;

              if (!topFixed) {
                newBox.y =
                  newBox.y + newBox.height - signH * snappedScreenH;
              }
              newBox.height = signH * snappedScreenH;
            }
          } else {
            // Non-keepRatio: snap แต่ละ dimension อิสระ
            if (sizeSnap.snappedWidth && widthChanged) {
              const snappedScreenW = sizeSnap.width * z;
              const signW = Math.sign(newBox.width) || 1;
              const targetW = signW * snappedScreenW;
              const leftFixed = Math.abs(oldBox.x - newBox.x) < 2;
              if (!leftFixed) {
                newBox.x = newBox.x + newBox.width - targetW;
              }
              newBox.width = targetW;
            }

            if (sizeSnap.snappedHeight && heightChanged) {
              const snappedScreenH = sizeSnap.height * z;
              const signH = Math.sign(newBox.height) || 1;
              const targetH = signH * snappedScreenH;
              const topFixed = Math.abs(oldBox.y - newBox.y) < 2;
              if (!topFixed) {
                newBox.y = newBox.y + newBox.height - targetH;
              }
              newBox.height = targetH;
            }
          }
        }

        const db = docScreenBounds(doc);
        if (isImage) {
          const { x, y, width, height } = newBox;
          if (x < db.l || y < db.t || x + width > db.r || y + height > db.b)
            return oldBox;
        } else {
          const c = clampEdges(newBox, db);
          if (c.width < 5 || c.height < 5) return oldBox;
          return { ...newBox, ...c };
        }
        return newBox;
      }}
    />
  );
}
