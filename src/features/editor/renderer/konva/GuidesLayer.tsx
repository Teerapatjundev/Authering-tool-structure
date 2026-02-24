/**
 * ===============================================
 * GUIDES LAYER - เส้น Snap Guides (Smart Guides)
 * ===============================================
 *
 * แสดงเส้น guides เมื่อ node snap กับ:
 * - กึ่งกลาง Canvas
 * - ขอบ / กึ่งกลาง ของ Nodes อื่น
 * - Equal spacing (padding) ระหว่าง Nodes ที่เรียงกัน
 *
 * เส้นจะแสดงเฉพาะบริเวณที่เกี่ยวข้อง (start → end)
 * พร้อมจุดกลมที่ปลายทั้งสองด้าน
 */

"use client";

import { Line, Circle, Rect, Text, Group } from "react-konva";
import { useSnapGuidesStore } from "../../stores/snapGuidesStore";

const GUIDE_COLOR = "#FF00FF"; // สี magenta
const GUIDE_WIDTH = 1;
const DOT_RADIUS = 3;

// Spacing guide styles
const SPACING_COLOR = "#FF00FF";
const SPACING_FILL_OPACITY = 0.1;
const SPACING_LINE_WIDTH = 1;
const ARROW_SIZE = 4;

export function GuidesLayer() {
  const { guides, spacingGuides } = useSnapGuidesStore();

  return (
    <>
      {/* === Snap Guides === */}
      {guides.map((guide, i) => {
        if (guide.type === "vertical") {
          // เส้นแนวตั้ง (snap แกน X)
          return (
            <Group key={`vguide-${i}`}>
              <Line
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
                x={guide.position}
                y={guide.start}
                radius={DOT_RADIUS}
                fill={GUIDE_COLOR}
              />
              <Circle
                x={guide.position}
                y={guide.end}
                radius={DOT_RADIUS}
                fill={GUIDE_COLOR}
              />
            </Group>
          );
        } else {
          // เส้นแนวนอน (snap แกน Y)
          return (
            <Group key={`hguide-${i}`}>
              <Line
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
                x={guide.start}
                y={guide.position}
                radius={DOT_RADIUS}
                fill={GUIDE_COLOR}
              />
              <Circle
                x={guide.end}
                y={guide.position}
                radius={DOT_RADIUS}
                fill={GUIDE_COLOR}
              />
            </Group>
          );
        }
      })}

      {/* === Equal Spacing (Padding) Guides === */}
      {spacingGuides.map((sg, gi) => (
        <Group key={`spacing-${gi}`}>
          {sg.segments.map((seg, si) => {
            if (sg.axis === "horizontal") {
              const gapWidth = seg.to - seg.from;
              const midX = (seg.from + seg.to) / 2;
              const y = seg.crossCenter;

              return (
                <Group key={`hseg-${gi}-${si}`}>
                  {/* พื้นที่ padding แบบโปร่งใส */}
                  <Rect
                    x={seg.from}
                    y={seg.crossStart}
                    width={gapWidth}
                    height={seg.crossEnd - seg.crossStart}
                    fill={SPACING_COLOR}
                    opacity={SPACING_FILL_OPACITY}
                  />
                  {/* เส้นวัดระยะแนวนอน */}
                  <Line
                    points={[seg.from, y, seg.to, y]}
                    stroke={SPACING_COLOR}
                    strokeWidth={SPACING_LINE_WIDTH}
                  />
                  {/* เครื่องหมายปลายซ้าย */}
                  <Line
                    points={[
                      seg.from,
                      y - ARROW_SIZE,
                      seg.from,
                      y + ARROW_SIZE,
                    ]}
                    stroke={SPACING_COLOR}
                    strokeWidth={SPACING_LINE_WIDTH}
                  />
                  {/* เครื่องหมายปลายขวา */}
                  <Line
                    points={[seg.to, y - ARROW_SIZE, seg.to, y + ARROW_SIZE]}
                    stroke={SPACING_COLOR}
                    strokeWidth={SPACING_LINE_WIDTH}
                  />
                  {/* แสดงค่าระยะห่าง */}
                  <Text
                    text={Math.round(gapWidth).toString()}
                    x={midX - 12}
                    y={y - 16}
                    fontSize={11}
                    fill={SPACING_COLOR}
                    fontStyle="bold"
                    align="center"
                    width={24}
                  />
                </Group>
              );
            } else {
              const gapHeight = seg.to - seg.from;
              const midY = (seg.from + seg.to) / 2;
              const x = seg.crossCenter;

              return (
                <Group key={`vseg-${gi}-${si}`}>
                  {/* พื้นที่ padding แบบโปร่งใส */}
                  <Rect
                    x={seg.crossStart}
                    y={seg.from}
                    width={seg.crossEnd - seg.crossStart}
                    height={gapHeight}
                    fill={SPACING_COLOR}
                    opacity={SPACING_FILL_OPACITY}
                  />
                  {/* เส้นวัดระยะแนวตั้ง */}
                  <Line
                    points={[x, seg.from, x, seg.to]}
                    stroke={SPACING_COLOR}
                    strokeWidth={SPACING_LINE_WIDTH}
                  />
                  {/* เครื่องหมายปลายบน */}
                  <Line
                    points={[
                      x - ARROW_SIZE,
                      seg.from,
                      x + ARROW_SIZE,
                      seg.from,
                    ]}
                    stroke={SPACING_COLOR}
                    strokeWidth={SPACING_LINE_WIDTH}
                  />
                  {/* เครื่องหมายปลายล่าง */}
                  <Line
                    points={[
                      x - ARROW_SIZE,
                      seg.to,
                      x + ARROW_SIZE,
                      seg.to,
                    ]}
                    stroke={SPACING_COLOR}
                    strokeWidth={SPACING_LINE_WIDTH}
                  />
                  {/* แสดงค่าระยะห่าง */}
                  <Text
                    text={Math.round(gapHeight).toString()}
                    x={x + 6}
                    y={midY - 6}
                    fontSize={11}
                    fill={SPACING_COLOR}
                    fontStyle="bold"
                  />
                </Group>
              );
            }
          })}
        </Group>
      ))}
    </>
  );
}
