"use client";

import { Line } from "react-konva";
import { useSnapGuidesStore } from "../../stores/snapGuidesStore";

const GUIDE_LINE_WIDTH = 1;
const GUIDE_COLOR = "#FF00FF";

export function GuidesLayer() {
  const { guides } = useSnapGuidesStore();

  return (
    <>
      {/* Render snap guide lines */}
      {guides.map((guide, i) => {
        if (guide.type === "vertical") {
          return (
            <Line
              key={`vguide-${i}`}
              points={[guide.position, -10000, guide.position, 10000]}
              stroke={GUIDE_COLOR}
              strokeWidth={GUIDE_LINE_WIDTH}
              dash={[5, 5]}
            />
          );
        } else {
          return (
            <Line
              key={`hguide-${i}`}
              points={[-10000, guide.position, 10000, guide.position]}
              stroke={GUIDE_COLOR}
              strokeWidth={GUIDE_LINE_WIDTH}
              dash={[5, 5]}
            />
          );
        }
      })}
    </>
  );
}
