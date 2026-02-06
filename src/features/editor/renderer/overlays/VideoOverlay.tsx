"use client";

import { useDocStore } from "../../stores/docStore";
import { useViewStore } from "../../stores/viewStore";
import { VideoNode } from "../../core/doc/types";

// Video overlay - renders HTML video elements positioned over Konva canvas
export function VideoOverlay() {
  const { doc } = useDocStore();
  const { viewport, worldToScreen } = useViewStore();

  if (!doc) return null;

  const videoNodes = doc.nodes.filter((n) => n.type === "video") as VideoNode[];

  return (
    <>
      {videoNodes.map((node) => {
        const screenPos = worldToScreen(node.x, node.y);
        const screenWidth = node.width * viewport.zoom;
        const screenHeight = node.height * viewport.zoom;

        return (
          <div
            key={node.id}
            style={{
              position: "absolute",
              left: screenPos.x - screenWidth / 2,
              top: screenPos.y - screenHeight / 2,
              width: screenWidth,
              height: screenHeight,
              pointerEvents: "none",
              opacity: node.opacity,
            }}
            className="border-2 border-blue-500"
          >
            <div className="w-full h-full bg-black flex items-center justify-center text-white text-xs">
              Video: {node.src}
            </div>
          </div>
        );
      })}
    </>
  );
}
