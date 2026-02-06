"use client";

import { useEffect } from "react";
import { Rect, Ellipse, Text, Image as KonvaImage, Group } from "react-konva";
import {
  Node,
  RectNode,
  EllipseNode,
  TextNode,
  ImageNode,
  VideoNode,
} from "../../core/doc/types";
import { useSelectionStore } from "../../stores/selectionStore";
import { useTextEditStore } from "../../stores/textEditStore";
import { imageCache } from "../../assets/imageCache";
import useImage from "use-image";

interface RenderNodesProps {
  nodes: Node[];
}

export function RenderNodes({ nodes }: RenderNodesProps) {
  return (
    <>
      {nodes.map((node) => {
        if (!node.visible) return null;
        return <RenderNode key={node.id} node={node} />;
      })}
    </>
  );
}

function RenderNode({ node }: { node: Node }) {
  const { isSelected } = useSelectionStore();
  const { startEditing } = useTextEditStore();
  const selected = isSelected(node.id);

  // Common props for all shapes
  const commonProps = {
    x: node.x,
    y: node.y,
    rotation: node.rotation,
    opacity: node.opacity,
    offsetX: node.width / 2,
    offsetY: node.height / 2,
    draggable: false, // Handled by SelectionController
  };

  const handleTextNodeDoubleClick = () => {
    startEditing(node.id, (node as TextNode).text);
  };

  switch (node.type) {
    case "rect":
      return (
        <Rect
          {...commonProps}
          width={node.width}
          height={node.height}
          fill={node.fill}
          stroke={node.stroke || undefined}
          strokeWidth={node.strokeWidth || 0}
          cornerRadius={node.cornerRadius || 0}
        />
      );

    case "ellipse":
      return (
        <Ellipse
          {...commonProps}
          radiusX={node.width / 2}
          radiusY={node.height / 2}
          fill={node.fill}
          stroke={node.stroke || undefined}
          strokeWidth={node.strokeWidth || 0}
          offsetX={0}
          offsetY={0}
        />
      );

    case "text":
      return (
        <Text
          {...commonProps}
          text={node.text}
          fontSize={node.fontSize}
          fontFamily={node.fontFamily}
          fill={node.fill}
          fontStyle={node.fontStyle || "normal"}
          align={node.align || "left"}
          verticalAlign={node.verticalAlign || "top"}
          width={node.width}
          height={node.height}
          onDblClick={handleTextNodeDoubleClick}
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

function RenderImage({
  node,
  commonProps,
}: {
  node: ImageNode;
  commonProps: any;
}) {
  const [image] = useImage(node.src, "anonymous");

  useEffect(() => {
    imageCache.preload(node.src);
  }, [node.src]);

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
  commonProps: any;
}) {
  // For video, render a placeholder rect
  // Actual video playback handled by VideoOverlay
  return (
    <Rect
      {...commonProps}
      width={node.width}
      height={node.height}
      fill="#000000"
      stroke="#666666"
      strokeWidth={2}
    />
  );
}
