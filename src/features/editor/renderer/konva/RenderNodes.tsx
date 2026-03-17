/**
 * ===============================================
 * RENDER NODES - Render ทุก Node
 * ===============================================
 *
 * Component ที่ render nodes ทั้งหมดเป็น Konva shapes
 *
 * Node Types:
 * - rect: Rect shape
 * - ellipse: Ellipse shape
 * - text: Text shape (double-click เพื่อแก้ไข)
 * - image: Image (โหลดจาก src)
 * - video: แสดงเป็น thumbnail (double-click เพื่อเล่น)
 *
 * หมายเหตุ: Node ใช้ CENTER-based coordinates
 * ดังนั้นต้อง set offsetX/offsetY = width/2, height/2
 */

"use client";

import { useEffect, useState } from "react";

import {
  Rect,
  Ellipse,
  Text,
  Image as KonvaImage,
  Group,
  Circle,
  RegularPolygon,
  Line,
} from "react-konva";
import useImage from "use-image";
import {
  Node,
  RectNode,
  EllipseNode,
  TriangleNode,
  PentagonNode,
  TextNode,
  TextLinkNode,
  ImageNode,
  VideoNode,
  AudioNode,
  PathNode,
} from "../../core/doc/types";
import { useTextEditStore } from "../../stores/textEditStore";
import { useTextLinkEditStore } from "../../stores/textLinkEditStore";
import { useVideoPlayStore } from "../../stores/videoPlayStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { TRI_BASE_SIZE, PENT_BASE_SIZE } from "./polygonGeometry";

interface RenderNodesProps {
  nodes: Node[];
}

function useUploadedVideoThumbnail(src: string, enabled: boolean) {
  const [thumbnailCanvas, setThumbnailCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );

  useEffect(() => {
    if (!enabled || !src) {
      setThumbnailCanvas(null);
      return;
    }

    let isCancelled = false;
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = src;

    const captureFrame = () => {
      if (isCancelled) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      const canvas = document.createElement("canvas");
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, vw, vh);
      setThumbnailCanvas(canvas);
    };

    const handleLoadedMetadata = () => {
      const targetTime = Number.isFinite(video.duration) && video.duration > 0.2 ? 0.2 : 0;
      if (targetTime <= 0) {
        captureFrame();
        return;
      }
      try {
        video.currentTime = targetTime;
      } catch {
        captureFrame();
      }
    };

    const handleSeeked = () => {
      captureFrame();
    };

    const handleError = () => {
      if (!isCancelled) setThumbnailCanvas(null);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);
    video.load();

    return () => {
      isCancelled = true;
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
      video.removeAttribute("src");
      video.load();
    };
  }, [enabled, src]);

  return thumbnailCanvas;
}

/**
 * Render ทุก nodes ที่ visible
 */
export function RenderNodes({ nodes }: RenderNodesProps) {
  const { editingNodeId } = useTextEditStore();
  const { editingNodeId: textLinkEditingId } = useTextLinkEditStore();

  return (
    <>
      {nodes.map((node) => {
        if (!node.visible) return null;
        // ซ่อน text ที่กำลังแก้ไขใน overlay
        if (node.type === "text" && node.id === editingNodeId) return null;
        // ไม่ซ่อน textlink เมื่อเปิด dialog (ยังคงแสดงอยู่เพื่อให้เห็นแบคกราวด์)
        return <RenderNode key={node.id} node={node} />;
      })}
    </>
  );
}

/**
 * Render node ตาม type
 */
function RenderNode({ node }: { node: Node }) {
  const { startEditing } = useTextEditStore();
  const { openDialog } = useTextLinkEditStore();

  // Common props ที่ทุก shape ใช้
  const commonProps = {
    id: `shape_${node.id}`, // ใช้สำหรับ find shape โดย SelectionController
    x: node.x, // CENTER x
    y: node.y, // CENTER y
    rotation: node.rotation,
    opacity: node.opacity,
    offsetX: node.width / 2, // Offset เพื่อให้ x,y เป็น center
    offsetY: node.height / 2,
    draggable: false, // การลากจัดการโดย EventBridge
  };

  switch (node.type) {
    case "rect":
      return <RenderRect node={node} commonProps={commonProps} />;

    case "ellipse":
      return <RenderEllipse node={node} commonProps={commonProps} />;

    case "triangle":
      return <RenderTriangle node={node} commonProps={commonProps} />;

    case "pentagon":
      return <RenderPentagon node={node} commonProps={commonProps} />;

    case "text":
      return (
        <RenderText
          node={node}
          commonProps={commonProps}
          onDoubleClick={() => startEditing(node.id, node.text)}
        />
      );

    case "textlink":
      return (
        <RenderTextLink
          node={node}
          commonProps={commonProps}
          onDoubleClick={() => openDialog(node.id)}
        />
      );

    case "image":
      return <RenderImage node={node} commonProps={commonProps} />;

    case "video":
      return <RenderVideo node={node} commonProps={commonProps} />;

    case "audio":
      return <RenderAudio node={node} commonProps={commonProps} />;

    case "path":
      return <RenderPath node={node} commonProps={commonProps} />;

    default:
      return null;
  }
}

// ===============================================
// INDIVIDUAL SHAPE RENDERERS
// ===============================================

function RenderRect({
  node,
  commonProps,
}: {
  node: RectNode;
  commonProps: Record<string, unknown>;
}) {
  return (
    <Rect
      {...commonProps}
      width={node.width}
      height={node.height}
      fill={node.fill}
      stroke={node.stroke}
      strokeWidth={node.strokeWidth || 0}
      cornerRadius={node.cornerRadius || 0}
    />
  );
}

function RenderEllipse({
  node,
  commonProps,
}: {
  node: EllipseNode;
  commonProps: Record<string, unknown>;
}) {
  return (
    <Ellipse
      {...commonProps}
      radiusX={node.width / 2}
      radiusY={node.height / 2}
      fill={node.fill}
      stroke={node.stroke}
      strokeWidth={node.strokeWidth || 0}
      offsetX={0} // Ellipse ใช้ center เป็น default อยู่แล้ว
      offsetY={0}
    />
  );
}

function RenderText({
  node,
  commonProps,
  onDoubleClick,
}: {
  node: TextNode;
  commonProps: Record<string, unknown>;
  onDoubleClick: () => void;
}) {
  return (
    <Text
      {...commonProps}
      text={node.text}
      fontSize={node.fontSize}
      fontFamily={node.fontFamily}
      fill={node.fill}
      fontStyle={node.fontStyle || "normal"}
      textDecoration={node.underline ? "underline" : undefined}
      align={node.align || "left"}
      width={node.width}
      height={node.height}
      onDblClick={onDoubleClick}
      onDblTap={onDoubleClick} // สำหรับ touch devices
    />
  );
}

function RenderTextLink({
  node,
  commonProps,
  onDoubleClick,
}: {
  node: TextLinkNode;
  commonProps: Record<string, unknown>;
  onDoubleClick: () => void;
}) {
  return (
    <Text
      {...commonProps}
      text={node.text}
      fontSize={node.fontSize}
      fontFamily={node.fontFamily}
      fill={node.fill}
      fontStyle={node.fontStyle || "normal"}
      textDecoration="underline"
      align={node.align || "left"}
      width={node.width}
      height={node.height}
      onDblClick={onDoubleClick}
      onDblTap={onDoubleClick}
    />
  );
}

function RenderTriangle({
  node,
  commonProps,
}: {
  node: TriangleNode;
  commonProps: Record<string, unknown>;
}) {
  return (
    <RegularPolygon
      {...commonProps}
      sides={3}
      radius={50}
      fill={node.fill}
      stroke={node.stroke}
      strokeWidth={node.strokeWidth || 0}
      scaleX={node.width / Math.max(1, TRI_BASE_SIZE.width)}
      scaleY={node.height / Math.max(1, TRI_BASE_SIZE.height)}
      offsetX={0}
      offsetY={0}
    />
  );
}

function RenderPentagon({
  node,
  commonProps,
}: {
  node: PentagonNode;
  commonProps: Record<string, unknown>;
}) {
  return (
    <RegularPolygon
      {...commonProps}
      sides={5}
      radius={50}
      fill={node.fill}
      stroke={node.stroke}
      strokeWidth={node.strokeWidth || 0}
      scaleX={node.width / Math.max(1, PENT_BASE_SIZE.width)}
      scaleY={node.height / Math.max(1, PENT_BASE_SIZE.height)}
      offsetX={0}
      offsetY={0}
    />
  );
}

function RenderImage({
  node,
  commonProps,
}: {
  node: ImageNode;
  commonProps: Record<string, unknown>;
}) {
  // โหลด image ด้วย useImage hook
  const [image] = useImage(node.src, "anonymous");

  return (
    <KonvaImage
      {...commonProps}
      image={image}
      width={node.width}
      height={node.height}
    />
  );
}

function RenderVideo({
  node,
  commonProps,
}: {
  node: VideoNode;
  commonProps: Record<string, unknown>;
}) {
  const { playVideo, playingNodeId } = useVideoPlayStore();
  const { clearSelection } = useSelectionStore();
  const isYouTubeSource = /^[a-zA-Z0-9_-]{11}$/.test(node.src);

  // Video thumbnail from YouTube (เฉพาะแหล่ง YouTube)
  const [thumbnail] = useImage(
    isYouTubeSource ? `https://img.youtube.com/vi/${node.src}/hqdefault.jpg` : "",
    "anonymous",
  );
  const uploadedThumbnail = useUploadedVideoThumbnail(node.src, !isYouTubeSource);
  const previewImage = isYouTubeSource ? thumbnail : uploadedThumbnail;

  // ถ้า video นี้กำลังเล่นอยู่ → ไม่แสดง thumbnail (overlay จะแสดงแทน)
  const isPlaying = playingNodeId === node.id;

  // Double-click / double-tap to play video
  const handlePlay = () => {
    if (!isPlaying) {
      // เคลียร์ selection ก่อนเล่น video เพื่อไม่ให้แสดง transform frame
      clearSelection();
      playVideo(node.id, node.src);
    }
  };

  return (
    <Group
      x={node.x}
      y={node.y}
      rotation={node.rotation}
      opacity={node.opacity}
      offsetX={node.width / 2}
      offsetY={node.height / 2}
      onDblClick={handlePlay}
      onDblTap={handlePlay}
    >
      {/* Background */}
      <Rect
        id={`shape_${node.id}`}
        x={0}
        y={0}
        width={node.width}
        height={node.height}
        fill="#1a1a1a"
        stroke="#333333"
        strokeWidth={2}
        cornerRadius={8}
      />

      {/* Thumbnail - ซ่อนถ้ากำลังเล่น */}
      {!isPlaying && previewImage && (
        <KonvaImage
          x={0}
          y={0}
          image={previewImage}
          width={node.width}
          height={node.height}
        />
      )}

      {!isPlaying && !previewImage && (
        <Text
          x={0}
          y={node.height / 2 - 10}
          width={node.width}
          text="Video file"
          align="center"
          fill="#ffffff"
          fontSize={16}
          fontStyle="bold"
        />
      )}

      {/* Play button overlay - แสดงเฉพาะตอนไม่ได้เล่น */}
      {!isPlaying && (
        <Group x={node.width / 2} y={node.height / 2}>
          {/* Semi-transparent circle */}
          <Circle radius={30} fill="rgba(0, 0, 0, 0.7)" />
          {/* Play triangle */}
          <RegularPolygon
            x={4}
            sides={3}
            radius={15}
            fill="white"
            rotation={90}
          />
        </Group>
      )}
    </Group>
  );
}

function RenderAudio({
  node,
  commonProps,
}: {
  node: AudioNode;
  commonProps: Record<string, unknown>;
}) {
  return (
    <>
      <Rect
        {...commonProps}
        width={node.width}
        height={node.height}
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth={2}
        cornerRadius={8}
      />
      <Text
        x={node.x - node.width / 2 + 14}
        y={node.y - node.height / 2 + 12}
        rotation={node.rotation}
        width={node.width - 28}
        text={`🔊 ${node.name || "Audio file"}`}
        fill="#0f172a"
        fontSize={14}
        fontStyle="bold"
        align="left"
      />
      <Text
        x={node.x - node.width / 2 + 14}
        y={node.y - node.height / 2 + 36}
        rotation={node.rotation}
        width={node.width - 28}
        text="Double-click to open audio"
        fill="#64748b"
        fontSize={12}
        align="left"
        onDblClick={() => window.open(node.src, "_blank", "noopener,noreferrer")}
        onDblTap={() => window.open(node.src, "_blank", "noopener,noreferrer")}
      />
    </>
  );
}

function RenderPath({
  node,
  commonProps,
}: {
  node: PathNode;
  commonProps: Record<string, unknown>;
}) {
  const tension = node.mode === "highlighter" ? 0.4 : 0.55;

  return (
    <Line
      {...commonProps}
      points={node.points}
      stroke={node.stroke}
      strokeWidth={node.strokeWidth}
      lineCap="round"
      lineJoin="round"
      tension={tension}
      globalCompositeOperation="source-over"
    />
  );
}

