/**
 * ===============================================
 * VIDEO OVERLAY - YouTube Player Inline
 * ===============================================
 *
 * Overlay สำหรับเล่น YouTube player แบบ inline บน video node
 * - คลิกที่ video → เริ่มเล่น
 * - มีปุ่ม Edit มุมซ้ายบน → ปิด video เพื่อ transform/move
 * - เมื่อมี marquee selection → ปิด pointer events ให้ลากคลุมได้
 *
 * Thumbnail ยังอยู่ใน Konva - overlay นี้แสดงเฉพาะตอนเล่น
 */

"use client";

import { useVideoPlayStore } from "../../stores/videoPlayStore";
import { useViewStore } from "../../stores/viewStore";
import { useDocStore } from "../../stores/docStore";
import { useMarqueeStore } from "../../stores/marqueeStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { VideoNode } from "../../core/doc/types";

export function VideoOverlay() {
  const { playingNodeId, videoSrc, stopVideo } = useVideoPlayStore();
  const { viewport, worldToScreen } = useViewStore();
  const { doc } = useDocStore();
  const { bounds: marqueeBounds } = useMarqueeStore();
  const { select } = useSelectionStore();

  const activePage =
    doc?.pages.find((p) => p.id === doc.activePageId) ?? doc?.pages[0] ?? null;

  // ไม่มี video กำลังเล่น
  if (!playingNodeId || !videoSrc) return null;

  // หา video node
  const node = activePage?.nodes.find(
    (n) => n.id === playingNodeId && n.type === "video",
  ) as VideoNode | undefined;

  if (!node) return null;

  // ถ้ามี marquee กำลัง drag → ไม่รับ pointer events
  const isMarqueeActive = marqueeBounds !== null;

  // คำนวณตำแหน่ง screen
  const screenPos = worldToScreen(node.x, node.y);
  const screenWidth = node.width * viewport.zoom;
  const screenHeight = node.height * viewport.zoom;

  /** หยุดเล่นและเลือก node สำหรับ edit */
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopVideo();
    select(playingNodeId);
  };

  /** คลิกที่ video overlay → ไม่ทำอะไร (ให้เล่นต่อ) */
  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const isYouTubeSource = /^[a-zA-Z0-9_-]{11}$/.test(videoSrc);

  return (
    <div
      className="absolute"
      style={{
        left: screenPos.x - screenWidth / 2,
        top: screenPos.y - screenHeight / 2,
        width: screenWidth,
        height: screenHeight,
        transform: `rotate(${node.rotation}deg)`,
        transformOrigin: "center center",
        pointerEvents: isMarqueeActive ? "none" : "auto",
        zIndex: 10,
      }}
      onClick={handleVideoClick}
    >
      {isYouTubeSource ? (
        <iframe
          className="w-full h-full rounded-lg"
          src={`https://www.youtube.com/embed/${videoSrc}?autoplay=1&enablejsapi=1`}
          title="YouTube Video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ pointerEvents: isMarqueeActive ? "none" : "auto" }}
        />
      ) : (
        <video
          className="w-full h-full rounded-lg bg-black"
          src={videoSrc}
          controls
          autoPlay
          style={{ pointerEvents: isMarqueeActive ? "none" : "auto" }}
        />
      )}

      {/* Edit button - top left */}
      <button
        onClick={handleEditClick}
        className="absolute top-2 left-2 bg-black/70 hover:bg-black/90 text-white rounded-lg px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors"
        style={{ pointerEvents: isMarqueeActive ? "none" : "auto" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit
      </button>
    </div>
  );
}
