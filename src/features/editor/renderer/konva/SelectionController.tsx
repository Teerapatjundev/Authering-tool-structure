"use client";

import { useEffect, useRef, useState } from "react";
import { Rect, Transformer } from "react-konva";
import Konva from "konva";
import { useSelectionStore } from "../../stores/selectionStore";
import { useDocStore } from "../../stores/docStore";
import { getMultiSelectionBounds } from "../../core/geometry/bounds";

interface SelectionControllerProps {
  stageRef: React.RefObject<Konva.Stage>;
}

export function SelectionController({ stageRef }: SelectionControllerProps) {
  const { selectedIds, getSelectedIds } = useSelectionStore();
  const { doc, updateNodes } = useDocStore();
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectionRectRef = useRef<Konva.Rect>(null);
  const [transforming, setTransforming] = useState(false);

  const selectedNodes = doc?.nodes.filter((n) => selectedIds.has(n.id)) || [];
  const bounds = getMultiSelectionBounds(selectedNodes);

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;

    if (selectedNodes.length === 0) {
      transformer.nodes([]);
      return;
    }

    // For multi-selection, attach to the selection rect proxy
    if (selectedNodes.length > 1) {
      const rect = selectionRectRef.current;
      if (rect) {
        transformer.nodes([rect]);
      }
    } else {
      // Single selection: find the actual Konva shape
      const selectedNode = selectedNodes[0];
      const shape = stage.findOne(`#shape_${selectedNode.id}`);
      if (shape) {
        transformer.nodes([shape]);
      }
    }

    transformer.getLayer()?.batchDraw();
  }, [selectedNodes, stageRef]);

  const handleTransformEnd = () => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const node = transformer.nodes()[0];
    if (!node) return;

    setTransforming(false);

    if (selectedNodes.length === 1) {
      // Single node transform
      const selectedNode = selectedNodes[0];
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      commitTransform([
        {
          id: selectedNode.id,
          changes: {
            x: node.x(),
            y: node.y(),
            width: selectedNode.width * scaleX,
            height: selectedNode.height * scaleY,
            rotation: node.rotation(),
          },
        },
      ]);

      // Reset scale after applying to dimensions
      node.scaleX(1);
      node.scaleY(1);
    } else if (selectedNodes.length > 1) {
      // Multi-selection transform
      const rect = selectionRectRef.current;
      if (!rect || !bounds) return;

      const scaleX = rect.scaleX();
      const scaleY = rect.scaleY();
      const rotation = rect.rotation();
      const newX = rect.x();
      const newY = rect.y();

      // Calculate deltas
      const dx = newX - (bounds.x + bounds.width / 2);
      const dy = newY - (bounds.y + bounds.height / 2);
      const dRotation = rotation;

      // Apply to all selected nodes
      const updates = selectedNodes.map((n) => ({
        id: n.id,
        changes: {
          x: n.x + dx,
          y: n.y + dy,
          width: n.width * scaleX,
          height: n.height * scaleY,
          rotation: n.rotation + dRotation,
        },
      }));

      commitTransform(updates);

      // Reset rect
      rect.scaleX(1);
      rect.scaleY(1);
      rect.rotation(0);
    }
  };

  if (!bounds || selectedNodes.length === 0) {
    return <Transformer ref={transformerRef} />;
  }

  // For multi-selection, render invisible proxy rect
  if (selectedNodes.length > 1) {
    return (
      <>
        <Rect
          ref={selectionRectRef}
          x={bounds.x + bounds.width / 2}
          y={bounds.y + bounds.height / 2}
          width={bounds.width}
          height={bounds.height}
          offsetX={bounds.width / 2}
          offsetY={bounds.height / 2}
          fill="transparent"
          stroke="blue"
          strokeWidth={2 / useViewStore.getState().viewport.zoom}
          dash={[5, 5]}
        />
        <Transformer
          ref={transformerRef}
          onTransformStart={() => setTransforming(true)}
          onTransformEnd={handleTransformEnd}
          boundBoxFunc={(oldBox, newBox) => {
            // Prevent negative dimensions
            if (newBox.width < 5 || newBox.height < 5) {
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
      onTransformStart={() => setTransforming(true)}
      onTransformEnd={handleTransformEnd}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 5 || newBox.height < 5) {
          return oldBox;
        }
        return newBox;
      }}
    />
  );
}

// Fix import
import { useViewStore } from "../../stores/viewStore";
import { commitTransform } from "../../core/commands/transform";
