/**
 * ===============================================
 * MARQUEE LAYER - แสดง Marquee Selection Rectangle
 * ===============================================
 *
 * แสดง rectangle สีฟ้าขณะที่ผู้ใช้ลากคลุมเลือก nodes
 */

"use client";

import { Rect } from "react-konva";
import { useMarqueeStore } from "../../stores/marqueeStore";

export function MarqueeLayer() {
  const { bounds } = useMarqueeStore();

  if (!bounds) return null;

  return (
    <Rect
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      fill="rgba(59, 130, 246, 0.1)" // น้ำเงินอ่อน
      stroke="#3b82f6" // น้ำเงิน
      strokeWidth={1}
      dash={[4, 2]} // เส้นประ
    />
  );
}
