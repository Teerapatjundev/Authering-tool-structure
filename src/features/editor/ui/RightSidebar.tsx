/**
 * ===============================================
 * RIGHT SIDEBAR - แผงแก้ไขคุณสมบัติ (Properties)
 * ===============================================
 *
 * แสดงและแก้ไข properties ของ node ที่เลือก:
 * - Position (x, y)
 * - Size (width, height)
 * - Rotation
 * - Opacity
 * - Fill color
 * - Stroke color
 * - Text properties (fontSize, fontFamily, etc.)
 *
 * รองรับ Multi-selection:
 * - ค่าเหมือนกัน → แสดงค่านั้น
 * - ค่าต่างกัน → แสดง "Mixed"
 * - เปลี่ยนค่า → ใช้กับทุก node ที่เลือก (single undo step)
 *
 * ใช้ shadcn/ui components:
 * - Input, Label, Slider, Select, Separator, Textarea, Button, ToggleGroup
 */

"use client";

import React from "react";
import { useSelectionStore } from "../stores/selectionStore";
import { useDocStore } from "../stores/docStore";
import { editNode, editNodes } from "../core/commands/edit";
import { Node, TextNode } from "../core/doc/types";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Palette,
  Move,
  Maximize2,
  RotateCw,
  Eye,
  Type,
  PenLine,
  RectangleHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================
// Helpers สำหรับ Multi-selection
// =============================================

const MIXED = Symbol("mixed");
type MixedValue<T> = T | typeof MIXED;

/** หาค่าร่วมจากหลาย nodes — ถ้าค่าเหมือนกันหมดจะ return ค่านั้น, ถ้าต่างกัน return MIXED */
function getCommon<T>(nodes: Node[], getter: (n: Node) => T): MixedValue<T> {
  const first = getter(nodes[0]);
  for (let i = 1; i < nodes.length; i++) {
    if (getter(nodes[i]) !== first) return MIXED;
  }
  return first;
}

/** หาค่าร่วมเฉพาะ nodes ที่ผ่าน filter */
function getCommonFiltered<T>(
  nodes: Node[],
  filter: (n: Node) => boolean,
  getter: (n: Node) => T,
): MixedValue<T> | undefined {
  const filtered = nodes.filter(filter);
  if (filtered.length === 0) return undefined;
  return getCommon(filtered, getter);
}

/** แปลง MixedValue เป็น string สำหรับ input */
function mixedToStr(
  v: MixedValue<string | number> | undefined,
  fallback = "",
): string {
  if (v === undefined || v === MIXED) return fallback;
  return String(v);
}

function isMixed(v: MixedValue<unknown> | undefined): boolean {
  return v === MIXED;
}

// =============================================
// Main Component
// =============================================

export function RightSidebar() {
  const { selectedIds } = useSelectionStore();
  const { doc } = useDocStore();

  // ดึง selected nodes
  const selectedNodes = doc?.nodes.filter((n) => selectedIds.has(n.id)) || [];
  const ids = selectedNodes.map((n) => n.id);

  // ถ้าไม่มี selection → แสดง Background Color
  if (selectedNodes.length === 0) {
    return (
      <aside className="flex flex-col h-full bg-background border-l w-72">
        <SidebarHeader title="Properties" />
        <div className="flex-1 p-4 space-y-4">
          <PropertySection icon={<Palette className="h-3.5 w-3.5" />} title="Background">
            <ColorInput
              value={doc?.backgroundColor || "#ffffff"}
              onChange={(v) => {
                useDocStore.getState().updateBackgroundColor(v);
                useDocStore.getState().autoSave();
              }}
            />
          </PropertySection>
        </div>
      </aside>
    );
  }

  const isSingle = selectedNodes.length === 1;
  const node = selectedNodes[0];
  const isMulti = selectedNodes.length > 1;

  // ========== Helper: apply change ==========
  const apply = (changes: Partial<Node>, typeFilter?: string[]) => {
    if (isSingle) {
      editNode(node.id, changes);
    } else {
      editNodes(ids, changes, typeFilter);
    }
  };

  // ========== Compute common values ==========
  const commonX = getCommon(selectedNodes, (n) => Math.round(n.x));
  const commonY = getCommon(selectedNodes, (n) => Math.round(n.y));
  const commonW = getCommon(selectedNodes, (n) => Math.round(n.width));
  const commonH = getCommon(selectedNodes, (n) => Math.round(n.height));
  const commonRotation = getCommon(selectedNodes, (n) =>
    Math.round(n.rotation),
  );
  const commonOpacity = getCommon(selectedNodes, (n) =>
    Math.round(n.opacity * 100),
  );

  // Fill color — rect, ellipse, text
  const hasFillNodes = selectedNodes.some(
    (n) => n.type === "rect" || n.type === "ellipse" || n.type === "text",
  );
  const commonFill = getCommonFiltered(
    selectedNodes,
    (n) => n.type === "rect" || n.type === "ellipse" || n.type === "text",
    (n) => (n as { fill?: string }).fill || "#000000",
  );

  // Stroke — rect, ellipse
  const hasStrokeNodes = selectedNodes.some(
    (n) => n.type === "rect" || n.type === "ellipse",
  );
  const commonStroke = getCommonFiltered(
    selectedNodes,
    (n) => n.type === "rect" || n.type === "ellipse",
    (n) => (n as { stroke?: string }).stroke || "#000000",
  );
  const commonStrokeWidth = getCommonFiltered(
    selectedNodes,
    (n) => n.type === "rect" || n.type === "ellipse",
    (n) => (n as { strokeWidth?: number }).strokeWidth || 0,
  );

  // Corner radius — rect only
  const hasRectNodes = selectedNodes.some((n) => n.type === "rect");
  const commonCornerRadius = getCommonFiltered(
    selectedNodes,
    (n) => n.type === "rect",
    (n) => (n as { cornerRadius?: number }).cornerRadius || 0,
  );

  // Text nodes
  const textNodes = selectedNodes.filter(
    (n) => n.type === "text",
  ) as TextNode[];
  const hasTextNodes = textNodes.length > 0;

  // Type label
  const typeLabel = isMulti
    ? `${selectedNodes.length} elements selected`
    : node.type;

  return (
    <aside className="flex flex-col h-full overflow-y-auto bg-background border-l w-72">
      <SidebarHeader title="Properties" subtitle={typeLabel} />

      <div className="flex-1 p-4 space-y-1">
        {/* Position */}
        <PropertySection icon={<Move className="h-3.5 w-3.5" />} title="Position">
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="X"
              value={isMixed(commonX) ? undefined : (commonX as number)}
              placeholder={isMixed(commonX) ? "Mixed" : undefined}
              onChange={(v) => apply({ x: v })}
            />
            <NumberField
              label="Y"
              value={isMixed(commonY) ? undefined : (commonY as number)}
              placeholder={isMixed(commonY) ? "Mixed" : undefined}
              onChange={(v) => apply({ y: v })}
            />
          </div>
        </PropertySection>

        <Separator />

        {/* Size */}
        <PropertySection icon={<Maximize2 className="h-3.5 w-3.5" />} title="Size">
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="W"
              value={isMixed(commonW) ? undefined : (commonW as number)}
              placeholder={isMixed(commonW) ? "Mixed" : undefined}
              onChange={(v) => apply({ width: v })}
              min={1}
            />
            <NumberField
              label="H"
              value={isMixed(commonH) ? undefined : (commonH as number)}
              placeholder={isMixed(commonH) ? "Mixed" : undefined}
              onChange={(v) => apply({ height: v })}
              min={1}
            />
          </div>
        </PropertySection>

        <Separator />

        {/* Rotation */}
        <PropertySection icon={<RotateCw className="h-3.5 w-3.5" />} title="Rotation">
          <NumberField
            label="°"
            value={
              isMixed(commonRotation) ? undefined : (commonRotation as number)
            }
            placeholder={isMixed(commonRotation) ? "Mixed" : undefined}
            onChange={(v) => apply({ rotation: v })}
            min={-180}
            max={180}
          />
        </PropertySection>

        <Separator />

        {/* Opacity */}
        <PropertySection icon={<Eye className="h-3.5 w-3.5" />} title="Opacity">
          <div className="space-y-2">
            <Slider
              min={0}
              max={100}
              step={1}
              value={[isMixed(commonOpacity) ? 50 : (commonOpacity as number)]}
              onValueChange={([v]) => apply({ opacity: v / 100 })}
            />
            <p className="text-xs text-center text-muted-foreground">
              {isMixed(commonOpacity)
                ? "Mixed"
                : `${commonOpacity as number}%`}
            </p>
          </div>
        </PropertySection>

        <Separator />

        {/* Fill Color — rect, ellipse, text */}
        {hasFillNodes && (
          <>
            <PropertySection icon={<Palette className="h-3.5 w-3.5" />} title="Fill Color">
              <ColorInput
                value={mixedToStr(commonFill, "#000000")}
                mixed={isMixed(commonFill)}
                onChange={(v) =>
                  apply({ fill: v }, ["rect", "ellipse", "text"])
                }
              />
            </PropertySection>
            <Separator />
          </>
        )}

        {/* Stroke — rect, ellipse */}
        {hasStrokeNodes && (
          <>
            <PropertySection icon={<PenLine className="h-3.5 w-3.5" />} title="Stroke">
              <ColorInput
                value={mixedToStr(commonStroke, "#000000")}
                mixed={isMixed(commonStroke)}
                onChange={(v) => apply({ stroke: v }, ["rect", "ellipse"])}
              />
              <div className="space-y-2">
                <Slider
                  min={0}
                  max={50}
                  step={1}
                  value={[isMixed(commonStrokeWidth) ? 0 : (commonStrokeWidth as number)]}
                  onValueChange={([v]) =>
                    apply({ strokeWidth: v }, ["rect", "ellipse"])
                  }
                />
                <p className="text-xs text-center text-muted-foreground">
                  {isMixed(commonStrokeWidth)
                    ? "Mixed"
                    : `${commonStrokeWidth as number}px`}
                </p>
              </div>
            </PropertySection>
            <Separator />
          </>
        )}

        {/* Corner Radius — rect */}
        {hasRectNodes && (
          <>
            <PropertySection
              icon={<RectangleHorizontal className="h-3.5 w-3.5" />}
              title="Corner Radius"
            >
              <NumberField
                label="Radius"
                value={
                  isMixed(commonCornerRadius)
                    ? undefined
                    : (commonCornerRadius as number)
                }
                placeholder={
                  isMixed(commonCornerRadius) ? "Mixed" : undefined
                }
                onChange={(v) => apply({ cornerRadius: v }, ["rect"])}
                min={0}
                max={100}
              />
            </PropertySection>
            <Separator />
          </>
        )}

        {/* Text Properties */}
        {hasTextNodes && (
          <MultiTextProperties
            textNodes={textNodes}
            allIds={ids}
            isSingle={isSingle}
          />
        )}
      </div>
    </aside>
  );
}

// ===============================================
// SUB COMPONENTS
// ===============================================

/** Sidebar header with title + optional subtitle */
function SidebarHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="px-4 py-3 border-b">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground capitalize">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Collapsible property section with icon + title */
function PropertySection({
  icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="py-2">
      <CollapsibleTrigger className="flex w-full items-center justify-between group">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wide">
          {icon}
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Number input field with label using shadcn Input */
function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        type="number"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        min={min}
        max={max}
        className="h-8 min-w-0 text-xs font-mono placeholder:italic [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
      />
    </div>
  );
}

/** Color picker with hex input using shadcn Input */
function ColorInput({
  value,
  onChange,
  mixed,
}: {
  value: string;
  onChange: (v: string) => void;
  mixed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          type="color"
          value={mixed ? "#888888" : value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-md border cursor-pointer bg-transparent"
        />
      </div>
      <Input
        type="text"
        value={mixed ? "" : value}
        placeholder={mixed ? "Mixed" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs font-mono placeholder:italic placeholder:font-sans"
      />
    </div>
  );
}

/**
 * Text Properties — รองรับ multi-selection
 * แสดง text properties เฉพาะ text nodes ที่เลือก
 */
function MultiTextProperties({
  textNodes,
  allIds,
  isSingle,
}: {
  textNodes: TextNode[];
  allIds: string[];
  isSingle: boolean;
}) {
  const textIds = textNodes.map((n) => n.id);

  const applyText = (changes: Partial<Node>) => {
    if (isSingle) {
      editNode(textNodes[0].id, changes);
    } else {
      editNodes(textIds, changes);
    }
  };

  const commonText = getCommon(
    textNodes as Node[],
    (n) => (n as TextNode).text,
  );
  const commonFontSize = getCommon(
    textNodes as Node[],
    (n) => (n as TextNode).fontSize,
  );
  const commonFontFamily = getCommon(
    textNodes as Node[],
    (n) => (n as TextNode).fontFamily,
  );
  const commonFontStyle = getCommon(
    textNodes as Node[],
    (n) => (n as TextNode).fontStyle || "normal",
  );
  const commonAlign = getCommon(
    textNodes as Node[],
    (n) => (n as TextNode).align || "left",
  );

  return (
    <>
      {/* Text Content */}
      <PropertySection icon={<Type className="h-3.5 w-3.5" />} title="Text">
        <Textarea
          value={isMixed(commonText) ? "" : (commonText as string)}
          placeholder={isMixed(commonText) ? "Mixed" : undefined}
          onChange={(e) => applyText({ text: e.target.value })}
          rows={3}
          className="text-xs resize-none placeholder:italic"
        />
      </PropertySection>

      <Separator />

      {/* Font Settings */}
      <PropertySection icon={<Type className="h-3.5 w-3.5" />} title="Font">
        <div className="space-y-2">
          <NumberField
            label="Size"
            value={
              isMixed(commonFontSize) ? undefined : (commonFontSize as number)
            }
            placeholder={isMixed(commonFontSize) ? "Mixed" : undefined}
            onChange={(v) => applyText({ fontSize: v })}
            min={8}
            max={200}
          />

          {/* Font Family — shadcn Select */}
          <Select
            value={
              isMixed(commonFontFamily) ? undefined : (commonFontFamily as string)
            }
            onValueChange={(v) => applyText({ fontFamily: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue
                placeholder={isMixed(commonFontFamily) ? "Mixed" : "Font"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Arial">Arial</SelectItem>
              <SelectItem value="Helvetica">Helvetica</SelectItem>
              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
              <SelectItem value="Georgia">Georgia</SelectItem>
              <SelectItem value="Courier New">Courier New</SelectItem>
              <SelectItem value="Verdana">Verdana</SelectItem>
            </SelectContent>
          </Select>

          {/* Font Style — shadcn Select */}
          <Select
            value={
              isMixed(commonFontStyle) ? undefined : (commonFontStyle as string)
            }
            onValueChange={(v) =>
              applyText({
                fontStyle: v as "normal" | "bold" | "italic",
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue
                placeholder={isMixed(commonFontStyle) ? "Mixed" : "Style"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
              <SelectItem value="italic">Italic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PropertySection>

      <Separator />

      {/* Alignment — shadcn ToggleGroup */}
      <PropertySection
        icon={<AlignLeft className="h-3.5 w-3.5" />}
        title="Alignment"
      >
        <ToggleGroup
          type="single"
          value={isMixed(commonAlign) ? undefined : (commonAlign as string)}
          onValueChange={(v) => {
            if (v) applyText({ align: v as "left" | "center" | "right" });
          }}
          className="justify-start"
        >
          <ToggleGroupItem value="left" size="sm" aria-label="Align left">
            <AlignLeft className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" size="sm" aria-label="Align center">
            <AlignCenter className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" size="sm" aria-label="Align right">
            <AlignRight className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </PropertySection>
    </>
  );
}
