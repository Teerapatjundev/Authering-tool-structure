"use client";

import { Line } from "react-konva";

const GRID_SIZE = 20;
const GRID_COLOR = "#E5E7EB"; // light gray
const MAJOR_GRID = 100; // every 5th line is darker
const MAJOR_GRID_COLOR = "#D1D5DB";

interface GridLayerProps {
  canvasWidth?: number;
  canvasHeight?: number;
}

export function GridLayer({
  canvasWidth = 1920,
  canvasHeight = 1080,
}: GridLayerProps) {
  const lines = [];

  // Vertical lines
  for (let x = 0; x < canvasWidth; x += GRID_SIZE) {
    const isMajor = x % MAJOR_GRID === 0;
    lines.push(
      <Line
        key={`vline-${x}`}
        points={[x, 0, x, canvasHeight]}
        stroke={isMajor ? MAJOR_GRID_COLOR : GRID_COLOR}
        strokeWidth={isMajor ? 1.5 : 0.5}
      />,
    );
  }

  // Horizontal lines
  for (let y = 0; y < canvasHeight; y += GRID_SIZE) {
    const isMajor = y % MAJOR_GRID === 0;
    lines.push(
      <Line
        key={`hline-${y}`}
        points={[0, y, canvasWidth, y]}
        stroke={isMajor ? MAJOR_GRID_COLOR : GRID_COLOR}
        strokeWidth={isMajor ? 1.5 : 0.5}
      />,
    );
  }

  return <>{lines}</>;
}
