"use client";

import { useEffect, useRef } from "react";
import Konva from "konva";
import { useViewStore } from "../../stores/viewStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useToolStore } from "../../stores/toolStore";
import { useDocStore } from "../../stores/docStore";
import { useSnapGuidesStore } from "../../stores/snapGuidesStore";
import { findTopNodeAt } from "../../core/geometry/hitTest";
import { boundsIntersect } from "../../core/geometry/bounds";
import { snapNode } from "../../core/geometry/snap";
import { commitMove } from "../../core/commands/transform";

interface EventBridgeProps {
  stageRef: React.RefObject<Konva.Stage>;
  width: number;
  height: number;
}

export function EventBridge({ stageRef, width, height }: EventBridgeProps) {
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const isMarqueeRef = useRef(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const { setZoom, viewport } = useViewStore.getState();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.05;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newZoom =
        direction > 0 ? viewport.zoom * scaleBy : viewport.zoom / scaleBy;

      setZoom(newZoom, pointer.x, pointer.y);
    };

    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
      const { activeTool } = useToolStore.getState();
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const { screenToWorld } = useViewStore.getState();
      const worldPos = screenToWorld(pointer.x, pointer.y);

      // Handle space + drag for panning (check if Space key is pressed)
      // Note: Space+click is handled separately, this is for middle mouse or explicit pan mode
      if (e.evt.button === 1) {
        useViewStore.getState().setIsPanning(true);
        dragStartRef.current = { x: pointer.x, y: pointer.y };
        return;
      }

      if (activeTool === "select") {
        const { doc } = useDocStore.getState();
        if (!doc) return;

        const hitNode = findTopNodeAt(doc.nodes, worldPos.x, worldPos.y);

        if (hitNode) {
          const { selectedIds, select, toggleSelect } =
            useSelectionStore.getState();

          if (e.evt.shiftKey) {
            toggleSelect(hitNode.id);
          } else {
            if (!selectedIds.has(hitNode.id)) {
              select(hitNode.id);
            }
          }

          isDraggingRef.current = true;
          dragStartRef.current = worldPos;
        } else {
          // Start marquee selection
          if (!e.evt.shiftKey) {
            useSelectionStore.getState().clearSelection();
          }
          isMarqueeRef.current = true;
          marqueeStartRef.current = worldPos;
        }
      }
    };

    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Panning
      if (useViewStore.getState().isPanning && dragStartRef.current) {
        const dx = pointer.x - dragStartRef.current.x;
        const dy = pointer.y - dragStartRef.current.y;
        useViewStore.getState().pan(dx, dy);
        dragStartRef.current = { x: pointer.x, y: pointer.y };
        return;
      }

      const { screenToWorld } = useViewStore.getState();
      const worldPos = screenToWorld(pointer.x, pointer.y);

      // Dragging selected nodes
      if (isDraggingRef.current && dragStartRef.current) {
        const dx = worldPos.x - dragStartRef.current.x;
        const dy = worldPos.y - dragStartRef.current.y;

        const { getSelectedIds } = useSelectionStore.getState();
        const selectedIds = getSelectedIds();

        if (selectedIds.length > 0) {
          const { doc } = useDocStore.getState();
          if (doc) {
            // Detect snaps for the first selected node
            const firstSelectedId = Array.from(selectedIds)[0];
            const firstNode = doc.nodes.find((n) => n.id === firstSelectedId);
            if (firstNode) {
              const snapResult = snapNode(firstNode, doc.nodes, {
                x: dx,
                y: dy,
              });

              // Update guides in store
              const guides = [];
              if (snapResult.snappedX) {
                guides.push({
                  type: "vertical" as const,
                  position: snapResult.x,
                });
              }
              if (snapResult.snappedY) {
                guides.push({
                  type: "horizontal" as const,
                  position: snapResult.y,
                });
              }
              useSnapGuidesStore.getState().setGuides(guides);
            }

            const updates = selectedIds.map((id) => ({
              id,
              changes: {
                x: doc.nodes.find((n) => n.id === id)!.x + dx,
                y: doc.nodes.find((n) => n.id === id)!.y + dy,
              },
            }));

            useDocStore.getState().updateNodes(updates);
          }
        }

        dragStartRef.current = worldPos;
      }

      // Marquee selection
      if (isMarqueeRef.current && marqueeStartRef.current) {
        const marqueeBounds = {
          x: Math.min(marqueeStartRef.current.x, worldPos.x),
          y: Math.min(marqueeStartRef.current.y, worldPos.y),
          width: Math.abs(worldPos.x - marqueeStartRef.current.x),
          height: Math.abs(worldPos.y - marqueeStartRef.current.y),
        };

        const { doc } = useDocStore.getState();
        if (doc) {
          const intersecting = doc.nodes.filter((node) => {
            const nodeBounds = {
              x: node.x - node.width / 2,
              y: node.y - node.height / 2,
              width: node.width,
              height: node.height,
            };
            return boundsIntersect(nodeBounds, marqueeBounds);
          });

          useSelectionStore
            .getState()
            .selectMultiple(intersecting.map((n) => n.id));
        }
      }
    };

    const handleMouseUp = () => {
      const wasDragging = isDraggingRef.current;

      if (useViewStore.getState().isPanning) {
        useViewStore.getState().setIsPanning(false);
      }

      if (wasDragging) {
        // Commit move operation
        const { getSelectedIds } = useSelectionStore.getState();
        const selectedIds = getSelectedIds();
        if (selectedIds.length > 0) {
          const { doc } = useDocStore.getState();
          if (doc) {
            const updates = selectedIds.map((id) => {
              const node = doc.nodes.find((n) => n.id === id)!;
              return {
                id,
                changes: { x: node.x, y: node.y },
              };
            });
            commitMove(updates);
          }
        }
      }

      isDraggingRef.current = false;
      isMarqueeRef.current = false;
      dragStartRef.current = null;
      marqueeStartRef.current = null;
      useSnapGuidesStore.getState().clearGuides();
    };

    stage.on("wheel", handleWheel);
    stage.on("mousedown", handleMouseDown);
    stage.on("mousemove", handleMouseMove);
    stage.on("mouseup", handleMouseUp);
    stage.on("mouseleave", handleMouseUp);

    return () => {
      stage.off("wheel", handleWheel);
      stage.off("mousedown", handleMouseDown);
      stage.off("mousemove", handleMouseMove);
      stage.off("mouseup", handleMouseUp);
      stage.off("mouseleave", handleMouseUp);
    };
  }, [stageRef]);

  return null;
}
