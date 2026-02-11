/**
 * ===============================================
 * SELECTION CONTROLLER - Transform Handles
 * ===============================================
 *
 * แสดง transform handles สำหรับ selection:
 * - Single selection: Transformer attach กับ shape โดยตรง
 * - Multi-selection: ใช้ Rect proxy + คำนวณ transform แยกแต่ละ node
 *
 * Multi-selection behavior:
 * - Resize: แต่ละ node ขยาย/ย่อตามสัดส่วนตำแหน่งใน group
 * - Rotate: ทั้ง group หมุนรอบ center ของ group
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { Transformer, Rect } from "react-konva";
import Konva from "konva";
import { useSelectionStore } from "../../stores/selectionStore";
import { useDocStore } from "../../stores/docStore";
import { useViewStore } from "../../stores/viewStore";
import { useHistoryStore } from "../../core/history/historyStore";
import { useTextEditStore } from "../../stores/textEditStore";
import { TransformOp } from "../../core/history/ops";
import { Node } from "../../core/doc/types";
import { getMultiSelectionBounds } from "../../core/geometry/bounds";

interface SelectionControllerProps {
  stageRef: React.RefObject<Konva.Stage>;
}

// เก็บค่าเริ่มต้นของ nodes ก่อน transform
interface OriginalNodeState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export function SelectionController({ stageRef }: SelectionControllerProps) {
  const { selectedIds } = useSelectionStore();
  const { doc, updateNodes } = useDocStore();
  const { viewport } = useViewStore();
  const { editingNodeId } = useTextEditStore();

  const transformerRef = useRef<Konva.Transformer>(null);
  const proxyRectRef = useRef<Konva.Rect>(null);

  // เก็บค่าเริ่มต้นก่อน transform
  const originalStatesRef = useRef<OriginalNodeState[]>([]);
  const originalBoundsRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  // หา nodes ที่เลือกอยู่
  const selectedNodes = doc?.nodes.filter((n) => selectedIds.has(n.id)) || [];
  const bounds = getMultiSelectionBounds(selectedNodes);
  const isMultiSelect = selectedNodes.length > 1;

  // ถ้ากำลังแก้ไข text → ไม่แสดง transformer
  const isEditingText = editingNodeId !== null;

  // Force update transformer when single node's size changes
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer || selectedNodes.length !== 1 || isEditingText) return;

    const node = selectedNodes[0];
    // Force transformer to update its bounds
    transformer.forceUpdate();
    transformer.getLayer()?.batchDraw();
  }, [selectedNodes, isEditingText]);

  // Attach transformer
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;

    if (selectedNodes.length === 0 || isEditingText) {
      transformer.nodes([]);
      return;
    }

    if (isMultiSelect) {
      // Multi-selection: attach กับ proxy rect
      const proxyRect = proxyRectRef.current;
      if (proxyRect) {
        transformer.nodes([proxyRect]);
      }
    } else {
      // Single selection: attach กับ shape โดยตรง
      const shape = stage.findOne(`#shape_${selectedNodes[0].id}`);
      if (shape) {
        transformer.nodes([shape]);
      }
    }

    transformer.getLayer()?.batchDraw();
  }, [selectedNodes, stageRef, selectedIds, isMultiSelect, isEditingText]);

  /**
   * เริ่ม transform - บันทึกค่าเริ่มต้น
   */
  const handleTransformStart = () => {
    // บันทึกค่าเดิมของทุก selected nodes
    originalStatesRef.current = selectedNodes.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      rotation: n.rotation,
    }));

    // บันทึก bounds เริ่มต้น (รวม center)
    if (bounds) {
      originalBoundsRef.current = {
        ...bounds,
        centerX: bounds.x + bounds.width / 2,
        centerY: bounds.y + bounds.height / 2,
      };
    }
  };

  /**
   * Real-time transform update
   */
  const handleTransform = () => {
    const stage = stageRef.current;
    if (!stage) return;

    if (isMultiSelect) {
      // ===============================================
      // Multi-selection transform
      // ===============================================
      const proxyRect = proxyRectRef.current;
      if (!proxyRect || !originalBoundsRef.current) return;

      const origBounds = originalBoundsRef.current;
      const scaleX = proxyRect.scaleX();
      const scaleY = proxyRect.scaleY();
      const rotation = proxyRect.rotation();

      // Proxy center (after transform)
      const newCenterX = proxyRect.x();
      const newCenterY = proxyRect.y();

      // Apply transform ให้แต่ละ node
      const updates: Array<{ id: string; changes: Partial<Node> }> = [];

      originalStatesRef.current.forEach((orig) => {
        // ขนาดใหม่
        const newWidth = Math.abs(orig.width * scaleX);
        const newHeight = Math.abs(orig.height * scaleY);

        // คำนวณ relative position จาก original center ของ bounds
        const relX = orig.x - origBounds.centerX;
        const relY = orig.y - origBounds.centerY;

        // Scale relative position
        const scaledRelX = relX * scaleX;
        const scaledRelY = relY * scaleY;

        // Rotate relative position around center
        const rad = (rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rotatedRelX = scaledRelX * cos - scaledRelY * sin;
        const rotatedRelY = scaledRelX * sin + scaledRelY * cos;

        // ตำแหน่งใหม่
        const newX = newCenterX + rotatedRelX;
        const newY = newCenterY + rotatedRelY;

        // Rotation ใหม่
        const newRotation = orig.rotation + rotation;

        updates.push({
          id: orig.id,
          changes: {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            rotation: newRotation,
          },
        });
      });

      if (updates.length > 0) {
        updateNodes(updates);
      }
    } else {
      // ===============================================
      // Single selection transform
      // ===============================================
      const node = selectedNodes[0];
      if (!node) return;

      const shape = stage.findOne(`#shape_${node.id}`);
      if (!shape) return;

      const original = originalStatesRef.current[0];
      if (!original) return;

      const scaleX = shape.scaleX();
      const scaleY = shape.scaleY();

      updateNodes([
        {
          id: node.id,
          changes: {
            x: shape.x(),
            y: shape.y(),
            width: Math.abs(original.width * scaleX),
            height: Math.abs(original.height * scaleY),
            rotation: shape.rotation(),
          },
        },
      ]);
    }
  };

  /**
   * จบการ transform - บันทึก history
   */
  const handleTransformEnd = () => {
    const stage = stageRef.current;
    if (!stage) return;

    // สร้าง TransformOp
    const transformUpdates: Array<{
      id: string;
      oldProps: Partial<Node>;
      newProps: Partial<Node>;
    }> = [];

    selectedNodes.forEach((node) => {
      const original = originalStatesRef.current.find((o) => o.id === node.id);
      if (!original) return;

      transformUpdates.push({
        id: node.id,
        oldProps: {
          x: original.x,
          y: original.y,
          width: original.width,
          height: original.height,
          rotation: original.rotation,
        },
        newProps: {
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          rotation: node.rotation,
        },
      });
    });

    // Reset scales
    if (isMultiSelect) {
      const proxyRect = proxyRectRef.current;
      if (proxyRect) {
        proxyRect.scaleX(1);
        proxyRect.scaleY(1);
        proxyRect.rotation(0);
        // Update proxy position to new bounds center
        const newBounds = getMultiSelectionBounds(selectedNodes);
        if (newBounds) {
          proxyRect.x(newBounds.x + newBounds.width / 2);
          proxyRect.y(newBounds.y + newBounds.height / 2);
          proxyRect.width(newBounds.width);
          proxyRect.height(newBounds.height);
          proxyRect.offsetX(newBounds.width / 2);
          proxyRect.offsetY(newBounds.height / 2);
        }
      }
    } else {
      const shape = stage.findOne(`#shape_${selectedNodes[0]?.id}`);
      if (shape) {
        shape.scaleX(1);
        shape.scaleY(1);
      }
    }

    // Commit to history
    const hasChanges = transformUpdates.some(
      (u) =>
        u.oldProps.x !== u.newProps.x ||
        u.oldProps.y !== u.newProps.y ||
        u.oldProps.width !== u.newProps.width ||
        u.oldProps.height !== u.newProps.height ||
        u.oldProps.rotation !== u.newProps.rotation,
    );

    if (hasChanges && transformUpdates.length > 0) {
      const op: TransformOp = {
        type: "transform",
        timestamp: Date.now(),
        updates: transformUpdates,
      };

      const { past } = useHistoryStore.getState();
      useHistoryStore.setState({
        past: [...past, op],
        future: [],
      });

      useDocStore.getState().autoSave();
    }

    // Clear refs
    originalStatesRef.current = [];
    originalBoundsRef.current = null;

    // Force update transformer
    transformerRef.current?.forceUpdate();
  };

  // ไม่มี selection หรือกำลังแก้ไข text
  if (selectedNodes.length === 0 || isEditingText) {
    return <Transformer ref={transformerRef} />;
  }

  // Multi-selection: แสดง proxy rect
  if (isMultiSelect && bounds) {
    return (
      <>
        {/* Proxy rect สำหรับ multi-selection */}
        <Rect
          ref={proxyRectRef}
          x={bounds.x + bounds.width / 2}
          y={bounds.y + bounds.height / 2}
          width={bounds.width}
          height={bounds.height}
          offsetX={bounds.width / 2}
          offsetY={bounds.height / 2}
          fill="transparent"
          stroke="#0066ff"
          strokeWidth={1 / viewport.zoom}
          dash={[5 / viewport.zoom, 5 / viewport.zoom]}
          listening={false}
        />
        <Transformer
          ref={transformerRef}
          onTransformStart={handleTransformStart}
          onTransform={handleTransform}
          onTransformEnd={handleTransformEnd}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          rotationSnapTolerance={5}
          keepRatio={false}
          enabledAnchors={[
            "top-left",
            "top-center",
            "top-right",
            "middle-left",
            "middle-right",
            "bottom-left",
            "bottom-center",
            "bottom-right",
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
              return oldBox;
            }
            return newBox;
          }}
        />
      </>
    );
  }

  // Single selection
  return (
    <Transformer
      ref={transformerRef}
      onTransformStart={handleTransformStart}
      onTransform={handleTransform}
      onTransformEnd={handleTransformEnd}
      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
      rotationSnapTolerance={5}
      keepRatio={false}
      enabledAnchors={[
        "top-left",
        "top-center",
        "top-right",
        "middle-left",
        "middle-right",
        "bottom-left",
        "bottom-center",
        "bottom-right",
      ]}
      boundBoxFunc={(oldBox, newBox) => {
        if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
          return oldBox;
        }
        return newBox;
      }}
    />
  );
}
