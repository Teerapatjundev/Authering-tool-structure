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

import {
  Rect,
  Ellipse,
  Text,
  Image as KonvaImage,
  Group,
  Circle,
  RegularPolygon,
} from "react-konva";
import useImage from "use-image";
import {
  Node,
  RectNode,
  EllipseNode,
  TextNode,
  ImageNode,
  VideoNode,
} from "../../core/doc/types";
import { useTextEditStore } from "../../stores/textEditStore";
import { useVideoPlayStore } from "../../stores/videoPlayStore";
import { useSelectionStore } from "../../stores/selectionStore";

interface RenderNodesProps {
  nodes: Node[];
}

/**
 * Render ทุก nodes ที่ visible
 */
export function RenderNodes({ nodes }: RenderNodesProps) {
  const { editingNodeId } = useTextEditStore();

  return (
    <>
      {nodes.map((node) => {
        if (!node.visible) return null;
        // ซ่อน text ที่กำลังแก้ไขใน overlay
        if (node.type === "text" && node.id === editingNodeId) return null;
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

    case "text":
      return (
        <RenderText
          node={node}
          commonProps={commonProps}
          onDoubleClick={() => startEditing(node.id, node.text)}
        />
      );

    case "image":
      return <RenderImage node={node} commonProps={commonProps} />;

    case "video":
      return <RenderVideo node={node} commonProps={commonProps} />;

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
      align={node.align || "left"}
      width={node.width}
      height={node.height}
      onDblClick={onDoubleClick}
      onDblTap={onDoubleClick} // สำหรับ touch devices
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

  // Video thumbnail from YouTube
  const [thumbnail] = useImage(
    `https://img.youtube.com/vi/${node.src}/hqdefault.jpg`,
    "anonymous",
  );

  // ถ้า video นี้กำลังเล่นอยู่ → ไม่แสดง thumbnail (overlay จะแสดงแทน)
  const isPlaying = playingNodeId === node.id;

  // Single-click to play video
  const handleClick = () => {
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
      onClick={handleClick}
      onTap={handleClick}
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

      {/* YouTube Thumbnail - ซ่อนถ้ากำลังเล่น */}
      {!isPlaying && thumbnail && (
        <KonvaImage
          x={0}
          y={0}
          image={thumbnail}
          width={node.width}
          height={node.height}
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
