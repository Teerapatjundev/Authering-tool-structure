import { z } from "zod";

// Zod schemas for document validation

const BaseNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["rect", "ellipse", "text", "image", "video", "group"]),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
  locked: z.boolean(),
  visible: z.boolean(),
  name: z.string().optional(),
});

export const RectNodeSchema = BaseNodeSchema.extend({
  type: z.literal("rect"),
  fill: z.string(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  cornerRadius: z.number().optional(),
});

export const EllipseNodeSchema = BaseNodeSchema.extend({
  type: z.literal("ellipse"),
  fill: z.string(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
});

export const TextNodeSchema = BaseNodeSchema.extend({
  type: z.literal("text"),
  text: z.string(),
  fontSize: z.number(),
  fontFamily: z.string(),
  fill: z.string(),
  fontStyle: z.enum(["normal", "bold", "italic"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
});

export const ImageNodeSchema = BaseNodeSchema.extend({
  type: z.literal("image"),
  src: z.string(),
  cropX: z.number().optional(),
  cropY: z.number().optional(),
  cropWidth: z.number().optional(),
  cropHeight: z.number().optional(),
});

export const VideoNodeSchema = BaseNodeSchema.extend({
  type: z.literal("video"),
  src: z.string(),
  posterSrc: z.string().optional(),
});

export const GroupNodeSchema = BaseNodeSchema.extend({
  type: z.literal("group"),
  children: z.array(z.string()),
});

export const NodeSchema = z.discriminatedUnion("type", [
  RectNodeSchema,
  EllipseNodeSchema,
  TextNodeSchema,
  ImageNodeSchema,
  VideoNodeSchema,
  GroupNodeSchema,
]);

export const DocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  version: z.number(),
  nodes: z.array(NodeSchema),
  width: z.number(),
  height: z.number(),
  backgroundColor: z.string(),
  updatedAt: z.number(),
});
