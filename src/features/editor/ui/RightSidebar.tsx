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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../../components/ui/button";

// =============================================
// Helpers สำหรับ Multi-selection
// =============================================

const MIXED = Symbol("mixed");
type MixedValue<T> = T | typeof MIXED;

const SIDEBAR_DESIGN = {
  aside: "flex flex-col h-full bg-background border-l w-72",
  asideScrollable:
    "flex flex-col h-full overflow-y-auto bg-background border-l w-72",
  contentCompact: "flex-1 p-4 space-y-1",
  contentDefault: "flex-1 p-4 space-y-4",
  header: "px-5 py-3 ",
  headerTitle: "text-sm font-semibold tracking-tight",
  headerSubtitle: "mt-0.5 text-xs text-muted-foreground capitalize",
  section: "py-2",
  sectionTrigger: "flex w-full items-center justify-between group",
  sectionLabel:
    "flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wide",
  sectionIcon: "h-3.5 w-3.5",
  sectionChevron: "h-3.5 w-3.5 text-muted-foreground transition-transform",
  sectionContent: "pt-2 space-y-2",
} as const;

const FONT_SIZE_OPTIONS = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96,
];

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

function buildFontStyle(
  isBold: boolean,
  isItalic: boolean,
): TextNode["fontStyle"] {
  if (isBold && isItalic) return "bold italic";
  if (isBold) return "bold";
  if (isItalic) return "italic";
  return "normal";
}

// =============================================
// Main Component
// =============================================

export function RightSidebar() {
  const [activeTab, setActiveTab] = React.useState<"properties" | "answer">(
    "properties",
  );
  const { selectedIds } = useSelectionStore();
  const { doc } = useDocStore();

  const activePage =
    doc?.pages.find((p) => p.id === doc.activePageId) ?? doc?.pages[0] ?? null;

  // ดึง selected nodes
  const selectedNodes =
    activePage?.nodes.filter((n) => selectedIds.has(n.id)) || [];
  const ids = selectedNodes.map((n) => n.id);

  const isPracticeSelection = selectedNodes.some((n) => !!n.practice);
  const isNextButtonSelection = selectedNodes.some(
    (n) => n.practice?.type === "next-button",
  );

  // ถ้าไม่มี selection → แสดง Background Color
  if (selectedNodes.length === 0) {
    return (
      <aside className={SIDEBAR_DESIGN.aside}>
        <SidebarTabHeader activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === "properties" ? (
          <div className={SIDEBAR_DESIGN.contentDefault}>
            <PropertySection icon={Palette} title="Colors">
              <ColorInput
                value={activePage?.backgroundColor || "#ffffff"}
                onChange={(v) => {
                  useDocStore.getState().updateBackgroundColor(v);
                  useDocStore.getState().autoSave();
                }}
              />
            </PropertySection>
            <PropertySection title="คะแนนรวม">
              <div className="flex items-center gap-2">
                <Input className="h-8 text-xs" type="number" min={0} defaultValue={0} disabled />
                <span className="text-xs text-muted-foreground shrink-0">
                  คะแนน
                </span>
              </div>
            </PropertySection>
          </div>
        ) : (
          <div className={SIDEBAR_DESIGN.contentDefault}>
            <p className="py-8 text-sm text-center text-muted-foreground">
              ยังไม่ได้เลือก element
            </p>
          </div>
        )}
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
    (n) =>
      n.type === "rect" ||
      n.type === "ellipse" ||
      n.type === "triangle" ||
      n.type === "pentagon" ||
      n.type === "text",
  );
  const commonFill = getCommonFiltered(
    selectedNodes,
    (n) =>
      n.type === "rect" ||
      n.type === "ellipse" ||
      n.type === "triangle" ||
      n.type === "pentagon" ||
      n.type === "text",
    (n) => (n as { fill?: string }).fill || "#000000",
  );

  // === Fill-in-the-blank (แยกสีพื้นหลัง vs สีตัวอักษร placeholder) ===
  const isFillInTheBlankSelection = selectedNodes.some(
    (n) => n.practice?.type === "fill-in-the-blank",
  );
  const fillInTheBlankPracticeIds = new Set(
    selectedNodes
      .filter((n) => n.practice?.type === "fill-in-the-blank")
      .map((n) => n.practice?.id)
      .filter((id): id is string => typeof id === "string"),
  );

  const fillInTheBlankPracticeNodes = isFillInTheBlankSelection
    ? (activePage?.nodes.filter(
        (n) =>
          n.practice?.type === "fill-in-the-blank" &&
          typeof n.practice?.id === "string" &&
          fillInTheBlankPracticeIds.has(n.practice.id),
      ) ?? [])
    : [];

  const fillInTheBlankRectNodes = fillInTheBlankPracticeNodes.filter(
    (n) => n.type === "rect",
  );
  const fillInTheBlankTextNodes = fillInTheBlankPracticeNodes.filter(
    (n) => n.type === "text",
  );

  const commonFillInTheBlankBg = getCommonFiltered(
    fillInTheBlankPracticeNodes,
    (n) => n.type === "rect",
    (n) => (n as { fill?: string }).fill || "#ffffff",
  );

  const commonFillInTheBlankText = getCommonFiltered(
    fillInTheBlankPracticeNodes,
    (n) => n.type === "text",
    (n) => (n as { fill?: string }).fill || "#9ca3af",
  );

  const commonFillInTheBlankAnswer = getCommonFiltered(
    fillInTheBlankPracticeNodes,
    () => true,
    (n) =>
      typeof (n.practice as { fillInTheBlankAnswer?: unknown })?.fillInTheBlankAnswer ===
      "string"
        ? (n.practice as { fillInTheBlankAnswer: string }).fillInTheBlankAnswer
        : "",
  );

  const commonFillInTheBlankScore = getCommonFiltered(
    fillInTheBlankPracticeNodes,
    () => true,
    (n) => {
      const v = (n.practice as { fillInTheBlankScore?: unknown })
        ?.fillInTheBlankScore;
      return typeof v === "number" ? v : 0;
    },
  );

  const commonNumbersOnly = getCommonFiltered(
    fillInTheBlankPracticeNodes,
    () => true,
    (n) => {
      const v = (n.practice as { numbersOnly?: unknown })?.numbersOnly;
      return typeof v === "boolean" ? v : false;
    },
  );

  const nextButtonPracticeIds = new Set(
    selectedNodes
      .filter((n) => n.practice?.type === "next-button")
      .map((n) => n.practice?.id)
      .filter((id): id is string => typeof id === "string"),
  );

  const nextButtonPracticeNodes = isNextButtonSelection
    ? (activePage?.nodes.filter(
        (n) =>
          n.practice?.type === "next-button" &&
          typeof n.practice?.id === "string" &&
          nextButtonPracticeIds.has(n.practice.id),
      ) ?? [])
    : [];

  const commonNextButtonAction = getCommonFiltered(
    nextButtonPracticeNodes,
    () => true,
    (n) => n.practice?.nextButtonAction || "next-page",
  );

  // Stroke — rect, ellipse
  const hasStrokeNodes = selectedNodes.some(
    (n) =>
      n.type === "rect" ||
      n.type === "ellipse" ||
      n.type === "triangle" ||
      n.type === "pentagon",
  );
  const commonStroke = getCommonFiltered(
    selectedNodes,
    (n) =>
      n.type === "rect" ||
      n.type === "ellipse" ||
      n.type === "triangle" ||
      n.type === "pentagon",
    (n) => (n as { stroke?: string }).stroke || "#000000",
  );
  const commonStrokeWidth = getCommonFiltered(
    selectedNodes,
    (n) =>
      n.type === "rect" ||
      n.type === "ellipse" ||
      n.type === "triangle" ||
      n.type === "pentagon",
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

  return (
    <aside className={SIDEBAR_DESIGN.asideScrollable}>
      <SidebarTabHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "answer" ? (
        isFillInTheBlankSelection ? (
          <div className={SIDEBAR_DESIGN.contentDefault}>
            <PropertySection title="ตั้งค่าเฉลย">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="numbersOnly"
                    checked={
                      isMixed(commonNumbersOnly)
                        ? false
                        : (commonNumbersOnly as boolean)
                    }
                    onCheckedChange={(checked: boolean) => {
                      if (fillInTheBlankPracticeNodes.length === 0) return;
                      const basePractice = fillInTheBlankPracticeNodes[0]
                        ?.practice;
                      const isNumbersOnly = checked === true;
                      editNodes(
                        fillInTheBlankPracticeNodes.map((n) => n.id),
                        {
                          practice: {
                            ...(basePractice as any),
                            numbersOnly: isNumbersOnly,
                            fillInTheBlankAnswer: isNumbersOnly
                              ? (commonFillInTheBlankAnswer as string)?.replace(
                                  /[^0-9.]/g,
                                  "",
                                )
                              : (commonFillInTheBlankAnswer as string),
                          },
                        } as Partial<Node>,
                      );
                    }}
                  />
                  <Label
                    htmlFor="numbersOnly"
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    ตำตอบเฉพาะตัวเลข
                  </Label>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    คำตอบที่ถูกต้อง
                  </Label>
                  <Input
                    className="h-8 text-xs"
                    type={
                      !isMixed(commonNumbersOnly) &&
                      (commonNumbersOnly as boolean)
                        ? "number"
                        : "text"
                    }
                    value={
                      commonFillInTheBlankAnswer === undefined ||
                      isMixed(commonFillInTheBlankAnswer)
                        ? ""
                        : (commonFillInTheBlankAnswer as string)
                    }
                    placeholder={
                      commonFillInTheBlankAnswer === undefined ||
                      isMixed(commonFillInTheBlankAnswer)
                        ? "Mixed"
                        : undefined
                    }
                    onChange={(e) => {
                      let answer = e.target.value;
                      const isNumbersOnly =
                        !isMixed(commonNumbersOnly) &&
                        (commonNumbersOnly as boolean);
                      if (isNumbersOnly) {
                        answer = answer.replace(/[^0-9.]/g, "");
                      }
                      if (fillInTheBlankPracticeNodes.length === 0) return;
                      const basePractice = fillInTheBlankPracticeNodes[0]
                        ?.practice;
                      editNodes(
                        fillInTheBlankPracticeNodes.map((n) => n.id),
                        {
                          practice: {
                            ...(basePractice as any),
                            fillInTheBlankAnswer: answer,
                          },
                        } as Partial<Node>,
                      );
                    }}
                  />
                </div>

                <NumberField
                  label="คะแนน"
                  value={
                    isMixed(commonFillInTheBlankScore)
                      ? undefined
                      : (commonFillInTheBlankScore as number)
                  }
                  placeholder={
                    isMixed(commonFillInTheBlankScore) ? "Mixed" : undefined
                  }
                  onChange={(v) => {
                    if (fillInTheBlankPracticeNodes.length === 0) return;
                    const basePractice = fillInTheBlankPracticeNodes[0]
                      ?.practice;
                    editNodes(
                      fillInTheBlankPracticeNodes.map((n) => n.id),
                      {
                        practice: {
                          ...(basePractice as any),
                          fillInTheBlankScore: v,
                        },
                      } as Partial<Node>,
                    );
                  }}
                  min={0}
                />
              </div>
            </PropertySection>
          </div>
        ) : (
          <div className={SIDEBAR_DESIGN.contentDefault}>
            <p className="text-sm text-muted-foreground text-center py-8">
              ตั้งค่าเฉลยสำหรับ element นี้
            </p>
          </div>
        )
      ) : (
        <div className={SIDEBAR_DESIGN.contentCompact}>
          {/* Position */}
          <PropertySection icon={Move} title="Position">
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

          <SidebarDivider />

          {/* Size */}
          <PropertySection icon={Maximize2} title="Size">
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

          <SidebarDivider />

          {/* Rotation (disabled for practice nodes) */}
          {!isPracticeSelection && (
            <>
              <PropertySection icon={RotateCw} title="Rotation">
                <NumberField
                  label="°"
                  value={
                    isMixed(commonRotation)
                      ? undefined
                      : (commonRotation as number)
                  }
                  placeholder={isMixed(commonRotation) ? "Mixed" : undefined}
                  onChange={(v) => apply({ rotation: v })}
                  min={-180}
                  max={180}
                />
              </PropertySection>
              <SidebarDivider />
            </>
          )}

          {/* Opacity */}
          <PropertySection icon={Eye} title="Opacity">
            <div className="space-y-2">
              <Slider
                min={0}
                max={100}
                step={1}
                value={[isMixed(commonOpacity) ? 50 : (commonOpacity as number)]}
                onValueChange={([v]) => apply({ opacity: v / 100 })}
              />
              <p className="text-xs text-center text-muted-foreground">
                {isMixed(commonOpacity) ? "Mixed" : `${commonOpacity as number}%`}
              </p>
            </div>
          </PropertySection>

          <SidebarDivider />

          {/* Stroke — rect, ellipse */}
          {hasStrokeNodes && (
            <>
              <PropertySection icon={PenLine} title="Stroke">
                <ColorInput
                  value={mixedToStr(commonStroke, "#000000")}
                  mixed={isMixed(commonStroke)}
                  onChange={(v) =>
                    apply({ stroke: v }, [
                      "rect",
                      "ellipse",
                      "triangle",
                      "pentagon",
                    ])
                  }
                />
                <div className="space-y-2">
                  <Slider
                    min={0}
                    max={50}
                    step={1}
                    value={[
                      isMixed(commonStrokeWidth)
                        ? 0
                        : (commonStrokeWidth as number),
                    ]}
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
              <SidebarDivider />

              {/* Fill Color — rect, ellipse, text */}
              {hasFillNodes && (
                <>
                  {isFillInTheBlankSelection ? (
                    <>
                      <PropertySection icon={Palette} title="Background Color">
                        <ColorInput
                          value={mixedToStr(commonFillInTheBlankBg, "#ffffff")}
                          mixed={isMixed(commonFillInTheBlankBg)}
                          onChange={(v) => {
                            const ids = fillInTheBlankRectNodes.map((n) => n.id);
                            if (ids.length === 0) return;
                            editNodes(ids, { fill: v } as Partial<Node>);
                          }}
                        />
                      </PropertySection>
                      <SidebarDivider />

                      <PropertySection icon={Type} title="Text Color">
                        <ColorInput
                          value={mixedToStr(commonFillInTheBlankText, "#9ca3af")}
                          mixed={isMixed(commonFillInTheBlankText)}
                          onChange={(v) => {
                            const ids = fillInTheBlankTextNodes.map((n) => n.id);
                            if (ids.length === 0) return;
                            editNodes(ids, { fill: v } as Partial<Node>);
                          }}
                        />
                      </PropertySection>
                      <SidebarDivider />
                    </>
                  ) : (
                    <>
                      <PropertySection icon={Palette} title="Fill Color">
                        <ColorInput
                          value={mixedToStr(commonFill, "#000000")}
                          mixed={isMixed(commonFill)}
                          onChange={(v) =>
                            apply(
                              { fill: v },
                              ["rect", "ellipse", "triangle", "pentagon", "text"],
                            )
                          }
                        />
                      </PropertySection>
                      <SidebarDivider />
                    </>
                  )}
                </>
              )}

              {/* Corner Radius — rect */}
              {hasRectNodes && (
                <>
                  <PropertySection icon={RectangleHorizontal} title="Corner Radius">
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
                  <SidebarDivider />
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
            </>
          )}

          {/* Corner Radius — rect */}
          {hasRectNodes && (
            <>
              <PropertySection icon={RectangleHorizontal} title="Corner Radius">
                <NumberField
                  label="Radius"
                  value={
                    isMixed(commonCornerRadius)
                      ? undefined
                      : (commonCornerRadius as number)
                  }
                  placeholder={isMixed(commonCornerRadius) ? "Mixed" : undefined}
                  onChange={(v) => apply({ cornerRadius: v }, ["rect"])}
                  min={0}
                  max={100}
                />
              </PropertySection>
              <SidebarDivider />
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

          {isNextButtonSelection && (
            <>
              <SidebarDivider />
              <PropertySection title="ตั้งค่าการทำงานของปุ่ม">
                <Select
                  value={
                    isMixed(commonNextButtonAction)
                      ? undefined
                      : (commonNextButtonAction as string)
                  }
                  onValueChange={(value) => {
                    if (nextButtonPracticeNodes.length === 0) return;
                    const updates = nextButtonPracticeNodes.map((n) => ({
                      id: n.id,
                      changes: {
                        practice: {
                          ...(n.practice || {}),
                          nextButtonAction: value as
                            | "next-page"
                            | "previous-page"
                            | "selected-page",
                        },
                      } as Partial<Node>,
                    }));
                    useDocStore.getState().updateNodes(updates);
                  }}
                >
                  <SelectTrigger className="h-10 text-sm bg-white border-[#AEB3C5]">
                    <SelectValue
                      placeholder={
                        isMixed(commonNextButtonAction)
                          ? "Mixed"
                          : "เลือกการทำงานของปุ่ม"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="next-page">พาไปหน้าถัดไป</SelectItem>
                    <SelectItem value="previous-page">พาไปหน้าก่อนหน้า</SelectItem>
                    <SelectItem value="selected-page">พาไปหน้าที่เลือก</SelectItem>
                  </SelectContent>
                </Select>
              </PropertySection>
            </>
          )}
        </div>
      )}
    </aside>
  );
}

// ===============================================
// SUB COMPONENTS
// ===============================================

/** Tab header with Properties and ตั้งค่าเฉลย buttons */
function SidebarTabHeader({
  activeTab,
  onTabChange,
  subtitle,
}: {
  activeTab: "properties" | "answer";
  onTabChange: (tab: "properties" | "answer") => void;
  subtitle?: string;
}) {
  return (
    <div className={SIDEBAR_DESIGN.header}>
      <div className="flex gap-1 mt-2">
        <Button
          onClick={() => onTabChange("properties")}
          className={cn(
            "shadow-none flex-1 text-sm font-semibold tracking-tight py-1.5 px-2 rounded-md transition-colors bg-white border-none",
            activeTab === "properties"
              ? "bg-[#FFE5E6] text-[#ED1C24] hover:bg-[#FFE5E6] hover:text-[#ED1C24]"
              : "text-muted-foreground hover:bg-white hover:text-muted-foreground",
          )}
        >
          Properties
        </Button>
        <Button
          onClick={() => onTabChange("answer")}
          className={cn(
            "shadow-none flex-1 text-sm font-semibold tracking-tight py-1.5 px-2 rounded-md transition-colors bg-white border-none",
            activeTab === "answer"
              ? "bg-[#FFE5E6] text-[#ED1C24] hover:bg-[#FFE5E6] hover:text-[#ED1C24]"
              : "text-muted-foreground hover:bg-white hover:text-muted-foreground",
          )}
        >
          ตั้งค่าเฉลย
        </Button>
      </div>
      {subtitle && <p className={SIDEBAR_DESIGN.headerSubtitle}>{subtitle}</p>}
    </div>
  );
}

function SidebarDivider() {
  return <Separator />;
}

/** Collapsible property section with icon + title */
function PropertySection({
  icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon?: LucideIcon;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const Icon = icon;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={SIDEBAR_DESIGN.section}
    >
      <CollapsibleTrigger className={SIDEBAR_DESIGN.sectionTrigger}>
        <span className={SIDEBAR_DESIGN.sectionLabel}>
          {Icon && <Icon className={SIDEBAR_DESIGN.sectionIcon} />}
          {title}
        </span>
        <ChevronDown
          className={cn(SIDEBAR_DESIGN.sectionChevron, open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={SIDEBAR_DESIGN.sectionContent}>
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
      <Label className="text-xs shrink-0 whitespace-nowrap text-muted-foreground">
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
          className="w-8 h-8 bg-transparent border rounded-md cursor-pointer"
        />
      </div>
      <Input
        type="text"
        value={mixed ? "" : value}
        placeholder={mixed ? "Mixed" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs placeholder:italic placeholder:font-sans"
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
  const commonUnderline = getCommon(textNodes as Node[], (n) =>
    Boolean((n as TextNode).underline),
  );
  const commonAlign = getCommon(
    textNodes as Node[],
    (n) => (n as TextNode).align || "left",
  );

  const styleFromFirst = textNodes[0]?.fontStyle || "normal";
  const underlineFromFirst = Boolean(textNodes[0]?.underline);
  const boldMixed = isMixed(commonFontStyle);
  const italicMixed = isMixed(commonFontStyle);
  const underlineMixed = isMixed(commonUnderline);

  const boldValue = boldMixed
    ? styleFromFirst.includes("bold")
    : (commonFontStyle as string).includes("bold");
  const italicValue = italicMixed
    ? styleFromFirst.includes("italic")
    : (commonFontStyle as string).includes("italic");
  const underlineValue = underlineMixed
    ? underlineFromFirst
    : (commonUnderline as boolean);

  return (
    <>
      {/* Text Content */}
      <PropertySection icon={Type} title="Text">
        <Textarea
          value={isMixed(commonText) ? "" : (commonText as string)}
          placeholder={isMixed(commonText) ? "Mixed" : undefined}
          onChange={(e) => applyText({ text: e.target.value })}
          rows={3}
          className="text-xs resize-none placeholder:italic"
        />
      </PropertySection>

      <SidebarDivider />

      {/* Font Settings */}
      <PropertySection icon={Type} title="Font">
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground">Size</div>
            <Select
              value={
                isMixed(commonFontSize)
                  ? undefined
                  : String(commonFontSize as number)
              }
              onValueChange={(v) => applyText({ fontSize: Number(v) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue
                  placeholder={isMixed(commonFontSize) ? "Mixed" : "Size"}
                />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Family — shadcn Select */}
          <Select
            value={
              isMixed(commonFontFamily)
                ? undefined
                : (commonFontFamily as string)
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

          {/* Font Style Toggles */}
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground">Style</div>
            <ToggleGroup
              type="multiple"
              value={[
                ...(boldValue ? ["bold"] : []),
                ...(italicValue ? ["italic"] : []),
                ...(underlineValue ? ["underline"] : []),
              ]}
              onValueChange={(values) => {
                applyText({
                  fontStyle: buildFontStyle(
                    values.includes("bold"),
                    values.includes("italic"),
                  ),
                  underline: values.includes("underline"),
                });
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="bold" size="sm" aria-label="Bold">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#1f1f1f"
                >
                  <path d="M272-200v-560h221q65 0 120 40t55 111q0 51-23 78.5T602-491q25 11 55.5 41t30.5 90q0 89-65 124.5T501-200H272Zm121-112h104q48 0 58.5-24.5T566-372q0-11-10.5-35.5T494-432H393v120Zm0-228h93q33 0 48-17t15-38q0-24-17-39t-44-15h-95v109Z" />
                </svg>
              </ToggleGroupItem>
              <ToggleGroupItem value="italic" size="sm" aria-label="Italic">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#1f1f1f"
                >
                  <path d="M200-200v-100h160l120-360H320v-100h400v100H580L460-300h140v100H200Z" />
                </svg>{" "}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="underline"
                size="sm"
                aria-label="Underline"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#1f1f1f"
                >
                  <path d="M200-120v-80h560v80H200Zm123-223q-56-63-56-167v-330h103v336q0 56 28 91t82 35q54 0 82-35t28-91v-336h103v330q0 104-56 167t-157 63q-101 0-157-63Z" />
                </svg>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </PropertySection>

      <SidebarDivider />

      {/* Alignment — shadcn ToggleGroup */}
      <PropertySection icon={AlignLeft} title="Alignment">
        <ToggleGroup
          type="single"
          value={isMixed(commonAlign) ? undefined : (commonAlign as string)}
          onValueChange={(v) => {
            if (v) applyText({ align: v as "left" | "center" | "right" });
          }}
          className="justify-start"
        >
          <ToggleGroupItem value="left" size="sm" aria-label="Align left">
            <AlignLeft className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" size="sm" aria-label="Align center">
            <AlignCenter className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" size="sm" aria-label="Align right">
            <AlignRight className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </PropertySection>
    </>
  );
}
