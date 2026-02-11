/**
 * ===============================================
 * GUIDES LAYER - เส้น Snap Guides
 * ===============================================
 *
 * แสดงเส้น guides เมื่อ node snap กับ node อื่น
 * - Vertical line (แนวตั้ง): snap ในแกน X
 * - Horizontal line (แนวนอน): snap ในแกน Y
 *
 * เส้นจะแสดงเฉพาะขณะลาก node เท่านั้น
 */

"use client";

import { Line } from "react-konva";
import { useSnapGuidesStore } from "../../stores/snapGuidesStore";

const GUIDE_COLOR = "#FF00FF"; // สี magenta
const GUIDE_WIDTH = 1;

export function GuidesLayer() {
  const { guides } = useSnapGuidesStore();

  return (
    <>
      {guides.map((guide, i) => {
        if (guide.type === "vertical") {
          // เส้นแนวตั้ง
          return (
            <Line
              key={`vguide-${i}`}
              points={[guide.position, -10000, guide.position, 10000]}
              stroke={GUIDE_COLOR}
              strokeWidth={GUIDE_WIDTH}
              dash={[5, 5]}
            />
          );
        } else {
          // เส้นแนวนอน
          return (
            <Line
              key={`hguide-${i}`}
              points={[-10000, guide.position, 10000, guide.position]}
              stroke={GUIDE_COLOR}
              strokeWidth={GUIDE_WIDTH}
              dash={[5, 5]}
            />
          );
        }
      })}
    </>
  );
}
