/**
 * ===============================================
 * DRAG PREVIEW LAYER - ตัวอย่าง Shape ขณะลากจาก Sidebar
 * ===============================================
 *
 * แสดง ghost shape บน canvas เมื่อผู้ใช้ลาก element จาก sidebar
 * Shape จะแสดงเป็นรูปทรงจริง (rect, ellipse, text) ตามเมาส์
 * พร้อม opacity ลดลงเพื่อแสดงว่าเป็น preview
 */

"use client";

import { Rect, Ellipse, Text, Group } from "react-konva";
import { useDragPreviewStore } from "../../stores/dragPreviewStore";

// ขนาด default ของ element แต่ละประเภท (ต้องตรงกับ insert commands)
const SHAPE_DEFAULTS: Record<
  string,
  { width: number; height: number; fill: string; stroke: string }
> = {
  rect: {
    width: 150,
    height: 100,
    fill: "#3b82f6",
    stroke: "#1e40af",
  },
  ellipse: {
    width: 120,
    height: 120,
    fill: "#10b981",
    stroke: "#059669",
  },
  text: {
    width: 200,
    height: 50,
    fill: "#000000",
    stroke: "transparent",
  },
};

const PREVIEW_OPACITY = 0.5;

export function DragPreviewLayer() {
  const { active, elementType, worldX, worldY } = useDragPreviewStore();

  if (!active || !elementType || !SHAPE_DEFAULTS[elementType]) return null;

  const defaults = SHAPE_DEFAULTS[elementType];
  const halfW = defaults.width / 2;
  const halfH = defaults.height / 2;

  return (
    <Group opacity={PREVIEW_OPACITY} listening={false}>
      {elementType === "rect" && (
        <Rect
          x={worldX - halfW}
          y={worldY - halfH}
          width={defaults.width}
          height={defaults.height}
          fill={defaults.fill}
          stroke={defaults.stroke}
          strokeWidth={2}
          dash={[6, 3]}
        />
      )}

      {elementType === "ellipse" && (
        <Ellipse
          x={worldX}
          y={worldY}
          radiusX={halfW}
          radiusY={halfH}
          fill={defaults.fill}
          stroke={defaults.stroke}
          strokeWidth={2}
          dash={[6, 3]}
        />
      )}

      {elementType === "text" && (
        <>
          <Rect
            x={worldX - halfW}
            y={worldY - halfH}
            width={defaults.width}
            height={defaults.height}
            fill="#f3f4f6"
            stroke="#9ca3af"
            strokeWidth={1}
            dash={[4, 4]}
            cornerRadius={4}
          />
          <Text
            x={worldX - halfW}
            y={worldY - halfH + 8}
            width={defaults.width}
            height={defaults.height}
            text="Enter text"
            fontSize={24}
            fontFamily="Arial"
            fill="#000000"
            align="center"
            verticalAlign="middle"
          />
        </>
      )}
    </Group>
  );
}
