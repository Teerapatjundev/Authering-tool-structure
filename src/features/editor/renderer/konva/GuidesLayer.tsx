/**
 * ===============================================
 * GUIDES LAYER - เส้น Snap Guides (Smart Guides)
 * ===============================================
 *
 * แสดงเส้น guides เมื่อ node snap กับ:
 * - กึ่งกลาง Canvas
 * - ขอบ / กึ่งกลาง ของ Nodes อื่น
 *
 * เส้นจะแสดงเฉพาะบริเวณที่เกี่ยวข้อง (start → end)
 * พร้อมจุดกลมที่ปลายทั้งสองด้าน
 */

"use client";

import { Line, Circle } from "react-konva";
import { useSnapGuidesStore } from "../../stores/snapGuidesStore";

const GUIDE_COLOR = "#FF00FF"; // สี magenta
const GUIDE_WIDTH = 1;
const DOT_RADIUS = 3;

export function GuidesLayer() {
  const { guides } = useSnapGuidesStore();

  return (
    <>
      {guides.map((guide, i) => {
        if (guide.type === "vertical") {
          // เส้นแนวตั้ง (snap แกน X)
          return (
            <>
              <Line
                key={`vguide-${i}`}
                points={[
                  guide.position,
                  guide.start,
                  guide.position,
                  guide.end,
                ]}
                stroke={GUIDE_COLOR}
                strokeWidth={GUIDE_WIDTH}
                dash={[4, 4]}
              />
              {/* จุดปลาย */}
              <Circle
                key={`vdot-s-${i}`}
                x={guide.position}
                y={guide.start}
                radius={DOT_RADIUS}
                fill={GUIDE_COLOR}
              />
              <Circle
                key={`vdot-e-${i}`}
                x={guide.position}
                y={guide.end}
                radius={DOT_RADIUS}
                fill={GUIDE_COLOR}
              />
            </>
          );
        } else {
          // เส้นแนวนอน (snap แกน Y)
          return (
            <>
              <Line
                key={`hguide-${i}`}
                points={[
                  guide.start,
                  guide.position,
                  guide.end,
                  guide.position,
                ]}
                stroke={GUIDE_COLOR}
                strokeWidth={GUIDE_WIDTH}
                dash={[4, 4]}
              />
              {/* จุดปลาย */}
              <Circle
                key={`hdot-s-${i}`}
                x={guide.start}
                y={guide.position}
                radius={DOT_RADIUS}
                fill={GUIDE_COLOR}
              />
              <Circle
                key={`hdot-e-${i}`}
                x={guide.end}
                y={guide.position}
                radius={DOT_RADIUS}
                fill={GUIDE_COLOR}
              />
            </>
          );
        }
      })}
    </>
  );
}
