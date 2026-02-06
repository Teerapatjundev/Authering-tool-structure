"use client";

import { useEffect, useRef } from "react";
import { Stage, Layer } from "react-konva";
import { useViewStore } from "../../stores/viewStore";
import { useDocStore } from "../../stores/docStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useToolStore } from "../../stores/toolStore";
import { RenderNodes } from "./RenderNodes";
import { Rect } from "react-konva";
import Konva from "konva";
import { SelectionController } from "./SelectionController";
import { GuidesLayer } from "./GuidesLayer";
import { GridLayer } from "./GridLayer";
import { EventBridge } from "./EventBridge";

interface KonvaCanvasProps {
  width: number;
  height: number;
}

export function KonvaCanvas({ width, height }: KonvaCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const { viewport } = useViewStore();
  const { doc } = useDocStore();
  const nodes = doc?.nodes || [];

  useEffect(() => {
    // Set canvas size in view store
    useViewStore.getState().setCanvasSize(width, height);
  }, [width, height]);

  if (!doc) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-100">
        <p className="text-gray-500">Loading document...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-red-400 via-white to-blue-400 overflow-hidden flex items-center justify-center">
      {/* White canvas page with border */}
      <div
        className="relative bg-white shadow-2xl border-8 border-red-600"
        style={{ width: "1920px", height: "1080px" }}
      >
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          scaleX={viewport.zoom}
          scaleY={viewport.zoom}
          x={viewport.x}
          y={viewport.y}
        >
          {/* Grid layer */}
          <Layer>
            <GridLayer canvasWidth={1920} canvasHeight={1080} />
          </Layer>

          {/* Canvas background & content layer */}
          <Layer>
            <Rect
              x={0}
              y={0}
              width={1920}
              height={1080}
              fill={doc.backgroundColor || "#ffffff"}
            />
            <RenderNodes nodes={nodes} />
          </Layer>

          {/* Selection & guides layer */}
          <Layer>
            <SelectionController stageRef={stageRef} />
            <GuidesLayer />
          </Layer>
        </Stage>

        <EventBridge stageRef={stageRef} width={width} height={height} />
      </div>
    </div>
  );
}
