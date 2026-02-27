/**
 * ===============================================
 * KONVA CANVAS - Canvas หลัก
 * ===============================================
 *
 * Component หลักที่ render canvas โดยใช้ Konva
 *
 * โครงสร้าง Layers:
 * 1. Content Layer: พื้นหลังและ nodes ทั้งหมด
 * 2. Selection Layer: Transformer handles และ snap guides
 *
 * Features:
 * - Pan & Zoom (wheel + drag)
 * - Render nodes (rect, ellipse, text, image, video)
 * - Selection & Transform handles
 * - Snap guides
 */

"use client";

import { useEffect, useRef } from "react";
import { Stage, Layer, Rect, Group } from "react-konva";
import Konva from "konva";
import { useViewStore } from "../../stores/viewStore";
import { useDocStore } from "../../stores/docStore";
import { useToolStore } from "../../stores/toolStore";
import { RenderNodes } from "./RenderNodes";
import { GuidesLayer } from "./GuidesLayer";
import { MarqueeLayer } from "./MarqueeLayer";
import { DragPreviewLayer } from "./DragPreviewLayer";
import { EventBridge } from "./EventBridge";
import { SelectionController } from "./SelectionController";

interface KonvaCanvasProps {
  width: number;
  height: number;
}

export function KonvaCanvas({ width, height }: KonvaCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const { viewport, isPanning } = useViewStore();
  const { doc } = useDocStore();
  const activeTool = useToolStore((s) => s.activeTool);
  const nodes = doc?.nodes || [];

  const cursorStyle =
    activeTool === "pan"
      ? isPanning
        ? "grabbing"
        : "grab"
      : "default";

  // อัพเดท canvas size
  useEffect(() => {
    useViewStore.getState().setCanvasSize(width, height);
  }, [width, height]);

  // แสดง loading ถ้ายังไม่มี document
  if (!doc) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-100">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-200" style={{ cursor: cursorStyle }}>
      {/* Canvas container */}
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={viewport.zoom}
        scaleY={viewport.zoom}
        x={viewport.x}
        y={viewport.y}
      >
        {/* Layer 1: Content (background + nodes) */}
        <Layer>
          {/* พื้นหลัง canvas */}
          <Rect
            x={0}
            y={0}
            width={doc.width}
            height={doc.height}
            fill={doc.backgroundColor || "#ffffff"}
            shadowColor="black"
            shadowBlur={10}
            shadowOpacity={0.3}
            shadowOffsetX={5}
            shadowOffsetY={5}
          />

          {/* Group ที่ clip content ให้อยู่ภายใน document bounds */}
          <Group
            clipFunc={(ctx) => {
              ctx.rect(0, 0, doc.width, doc.height);
            }}
          >
            {/* Render ทุก nodes */}
            <RenderNodes nodes={nodes} />
          </Group>
        </Layer>

        {/* Layer 2: Selection & Guides & Marquee */}
        <Layer>
          <SelectionController stageRef={stageRef} />
          <GuidesLayer />
          <MarqueeLayer />
          <DragPreviewLayer />
        </Layer>
      </Stage>

      {/* Event handler (mouse/keyboard events) */}
      <EventBridge stageRef={stageRef} width={width} height={height} />
    </div>
  );
}
