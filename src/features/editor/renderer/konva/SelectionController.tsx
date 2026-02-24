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

  // ตรวจสอบว่า nodes ที่เลือกทั้งหมดถูกล็อคหรือไม่
  const allLocked = selectedNodes.length > 0 && selectedNodes.every((n) => n.locked);

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
        let finalX = newCenterX + rotatedRelX;
        let finalY = newCenterY + rotatedRelY;
        let finalW = newWidth;
        let finalH = newHeight;

        // Rotation ใหม่
        const newRotation = orig.rotation + rotation;

        // Clamp to document bounds (center-based coordinates)
        if (doc) {
          finalW = Math.min(finalW, doc.width);
          finalH = Math.min(finalH, doc.height);
          const halfW = finalW / 2;
          const halfH = finalH / 2;
          finalX = Math.max(halfW, Math.min(doc.width - halfW, finalX));
          finalY = Math.max(halfH, Math.min(doc.height - halfH, finalY));
        }

        updates.push({
          id: orig.id,
          changes: {
            x: finalX,
            y: finalY,
            width: finalW,
            height: finalH,
            rotation: newRotation,
          },
        });
      });

      if (updates.length > 0) {
        updateNodes(updates);
      }
    }
    // Single selection: ไม่อัพเดท store ระหว่าง transform
    // ป้องกัน double-scaling — ให้ Konva Transformer จัดการ visual
    // อัพเดทค่าจริงใน handleTransformEnd เท่านั้น
  };

  /**
   * จบการ transform - บันทึก history
   */
  const handleTransformEnd = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const transformUpdates: Array<{
      id: string;
      oldProps: Partial<Node>;
      newProps: Partial<Node>;
    }> = [];

    if (!isMultiSelect && selectedNodes.length === 1) {
      // ===============================================
      // Single selection: คำนวณค่าจาก Konva shape โดยตรง
      // (ไม่ได้อัพเดท store ระหว่าง transform เพื่อป้องกัน double-scaling)
      // ===============================================
      const node = selectedNodes[0];
      const shape = stage.findOne(`#shape_${node.id}`);
      const original = originalStatesRef.current[0];

      if (shape && original) {
        const scaleX = shape.scaleX();
        const scaleY = shape.scaleY();

        // คำนวณขนาดจริงจาก shape width * scale
        let finalWidth = Math.max(5, Math.abs(shape.width() * scaleX));
        let finalHeight = Math.max(5, Math.abs(shape.height() * scaleY));
        let finalX = shape.x();
        let finalY = shape.y();
        const finalRotation = shape.rotation();

        // Clamp to document bounds (center-based coordinates)
        if (doc) {
          // สำหรับ image: clamp โดยรักษาสัดส่วน
          if (node.type === "image") {
            const aspect = finalWidth / finalHeight;
            if (finalWidth > doc.width) {
              finalWidth = doc.width;
              finalHeight = finalWidth / aspect;
            }
            if (finalHeight > doc.height) {
              finalHeight = doc.height;
              finalWidth = finalHeight * aspect;
            }
          } else {
            finalWidth = Math.min(finalWidth, doc.width);
            finalHeight = Math.min(finalHeight, doc.height);
          }
          const halfW = finalWidth / 2;
          const halfH = finalHeight / 2;
          finalX = Math.max(halfW, Math.min(doc.width - halfW, finalX));
          finalY = Math.max(halfH, Math.min(doc.height - halfH, finalY));
        }

        // Reset shape scale และอัพเดท dimensions ป้องกัน visual glitch
        shape.scaleX(1);
        shape.scaleY(1);
        shape.x(finalX);
        shape.y(finalY);
        shape.width(finalWidth);
        shape.height(finalHeight);
        // อัพเดท offset สำหรับ center-based shapes (Rect, Text, Image)
        // Ellipse ใช้ offset = 0 เพราะ center-based โดยธรรมชาติ
        if (shape.offsetX() !== 0) {
          shape.offsetX(finalWidth / 2);
          shape.offsetY(finalHeight / 2);
        }

        // Update store
        updateNodes([{
          id: node.id,
          changes: {
            x: finalX,
            y: finalY,
            width: finalWidth,
            height: finalHeight,
            rotation: finalRotation,
          },
        }]);

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
            x: finalX,
            y: finalY,
            width: finalWidth,
            height: finalHeight,
            rotation: finalRotation,
          },
        });
      }
    } else {
      // ===============================================
      // Multi-selection: clamp ค่าปัจจุบันแล้วสร้าง history
      // ===============================================
      const clampedUpdates: Array<{ id: string; changes: Partial<Node> }> = [];

      selectedNodes.forEach((node) => {
        const original = originalStatesRef.current.find((o) => o.id === node.id);
        if (!original) return;

        let { x, y, width, height } = node;
        const { rotation } = node;

        // Clamp to document bounds
        if (doc) {
          width = Math.min(width, doc.width);
          height = Math.min(height, doc.height);
          const halfW = width / 2;
          const halfH = height / 2;
          x = Math.max(halfW, Math.min(doc.width - halfW, x));
          y = Math.max(halfH, Math.min(doc.height - halfH, y));
        }

        clampedUpdates.push({
          id: node.id,
          changes: { x, y, width, height },
        });

        transformUpdates.push({
          id: node.id,
          oldProps: {
            x: original.x,
            y: original.y,
            width: original.width,
            height: original.height,
            rotation: original.rotation,
          },
          newProps: { x, y, width, height, rotation },
        });
      });

      // Batch update ค่าที่ clamp แล้ว
      if (clampedUpdates.length > 0) {
        updateNodes(clampedUpdates);
      }

      // Reset proxy rect
      const proxyRect = proxyRectRef.current;
      if (proxyRect) {
        proxyRect.scaleX(1);
        proxyRect.scaleY(1);
        proxyRect.rotation(0);
        const currentNodes = doc?.nodes.filter((n) => selectedIds.has(n.id)) || [];
        const newBounds = getMultiSelectionBounds(currentNodes);
        if (newBounds) {
          proxyRect.x(newBounds.x + newBounds.width / 2);
          proxyRect.y(newBounds.y + newBounds.height / 2);
          proxyRect.width(newBounds.width);
          proxyRect.height(newBounds.height);
          proxyRect.offsetX(newBounds.width / 2);
          proxyRect.offsetY(newBounds.height / 2);
        }
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

  // ถ้า nodes ทั้งหมดถูกล็อค → แสดง transformer แบบไม่มี handles (ไม่ให้ resize/rotate)
  if (allLocked) {
    return (
      <Transformer
        ref={transformerRef}
        enabledAnchors={[]}
        rotateEnabled={false}
        borderStroke="#ff4444"
        borderDash={[4, 4]}
      />
    );
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
            // Clamp to document bounds (convert to absolute/screen coords)
            if (doc) {
              const { viewport } = useViewStore.getState();
              const zoom = viewport.zoom;
              const docLeft = viewport.x;
              const docTop = viewport.y;
              const docRight = doc.width * zoom + viewport.x;
              const docBottom = doc.height * zoom + viewport.y;

              let { x, y, width, height } = newBox;
              if (x < docLeft) { width -= (docLeft - x); x = docLeft; }
              if (y < docTop) { height -= (docTop - y); y = docTop; }
              if (x + width > docRight) { width = docRight - x; }
              if (y + height > docBottom) { height = docBottom - y; }
              if (width < 10 || height < 10) return oldBox;
              return { ...newBox, x, y, width, height };
            }
            return newBox;
          }}
        />
      </>
    );
  }

  // Single selection
  const singleNode = selectedNodes[0];
  const isImage = singleNode?.type === "image";

  return (
    <Transformer
      ref={transformerRef}
      onTransformStart={handleTransformStart}
      onTransform={handleTransform}
      onTransformEnd={handleTransformEnd}
      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
      rotationSnapTolerance={5}
      keepRatio={isImage}
      enabledAnchors={
        isImage
          ? ["top-left", "top-right", "bottom-left", "bottom-right"]
          : [
              "top-left",
              "top-center",
              "top-right",
              "middle-left",
              "middle-right",
              "bottom-left",
              "bottom-center",
              "bottom-right",
            ]
      }
      boundBoxFunc={(oldBox, newBox) => {
        if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
          return oldBox;
        }
        // Clamp to document bounds (convert to absolute/screen coords)
        if (doc) {
          const { viewport } = useViewStore.getState();
          const zoom = viewport.zoom;
          const docLeft = viewport.x;
          const docTop = viewport.y;
          const docRight = doc.width * zoom + viewport.x;
          const docBottom = doc.height * zoom + viewport.y;

          let { x, y, width, height } = newBox;

          // ตรวจว่าเป็นการ rotate หรือ resize
          // ถ้า width/height เท่าเดิม (หรือเปลี่ยนน้อยมาก) แสดงว่าเป็นการ rotate → ไม่ต้อง clamp
          const isRotating =
            Math.abs(oldBox.width - newBox.width) < 1 &&
            Math.abs(oldBox.height - newBox.height) < 1;

          if (!isRotating) {
            if (isImage) {
              // รูปภาพ: clamp โดยรักษาสัดส่วน — ถ้าชนขอบ ให้คืนกล่องเดิม
              const clippedLeft = Math.max(0, docLeft - x);
              const clippedTop = Math.max(0, docTop - y);
              const clippedRight = Math.max(0, (x + width) - docRight);
              const clippedBottom = Math.max(0, (y + height) - docBottom);
              if (clippedLeft > 0 || clippedTop > 0 || clippedRight > 0 || clippedBottom > 0) {
                return oldBox;
              }
            } else {
              if (x < docLeft) { width -= (docLeft - x); x = docLeft; }
              if (y < docTop) { height -= (docTop - y); y = docTop; }
              if (x + width > docRight) { width = docRight - x; }
              if (y + height > docBottom) { height = docBottom - y; }
            }
            if (width < 5 || height < 5) return oldBox;
          }
          return { ...newBox, x, y, width, height };
        }
        return newBox;
      }}
    />
  );
}
