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
 */

"use client";

import { useSelectionStore } from "../stores/selectionStore";
import { useDocStore } from "../stores/docStore";
import { editNode, editNodes } from "../core/commands/edit";
import { Node, TextNode } from "../core/doc/types";

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
function mixedToStr(v: MixedValue<string | number> | undefined, fallback = ""): string {
  if (v === undefined || v === MIXED) return fallback;
  return String(v);
}

function mixedToNum(v: MixedValue<number> | undefined, fallback = 0): number {
  if (v === undefined || v === MIXED) return fallback;
  return v;
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

  // ถ้าไม่มี selection
  if (selectedNodes.length === 0) {
    return (
      <aside className="flex flex-col h-full bg-white border-l border-gray-200 w-72">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Properties</h2>
        </div>
        <div className="flex items-center justify-center flex-1 p-4">
          <p className="text-sm text-center text-gray-400">
            Select an element to edit its properties
          </p>
        </div>
      </aside>
    );
  }

  const isSingle = selectedNodes.length === 1;
  const node = selectedNodes[0]; // ใช้สำหรับ single select
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
  const commonRotation = getCommon(selectedNodes, (n) => Math.round(n.rotation));
  const commonOpacity = getCommon(selectedNodes, (n) => Math.round(n.opacity * 100));

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
  const textNodes = selectedNodes.filter((n) => n.type === "text") as TextNode[];
  const hasTextNodes = textNodes.length > 0;

  // Type label
  const typeLabel = isMulti
    ? `${selectedNodes.length} elements selected`
    : node.type;

  return (
    <aside className="flex flex-col h-full overflow-y-auto bg-white border-l border-gray-200 w-72">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Properties</h2>
        <p className="mt-1 text-xs text-gray-500 capitalize">{typeLabel}</p>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Position */}
        <Section title="Position">
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="X"
              value={isMixed(commonX) ? undefined : (commonX as number)}
              placeholder={isMixed(commonX) ? "Mixed" : undefined}
              onChange={(v) => apply({ x: v })}
            />
            <NumberInput
              label="Y"
              value={isMixed(commonY) ? undefined : (commonY as number)}
              placeholder={isMixed(commonY) ? "Mixed" : undefined}
              onChange={(v) => apply({ y: v })}
            />
          </div>
        </Section>

        {/* Size */}
        <Section title="Size">
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="W"
              value={isMixed(commonW) ? undefined : (commonW as number)}
              placeholder={isMixed(commonW) ? "Mixed" : undefined}
              onChange={(v) => apply({ width: v })}
              min={1}
            />
            <NumberInput
              label="H"
              value={isMixed(commonH) ? undefined : (commonH as number)}
              placeholder={isMixed(commonH) ? "Mixed" : undefined}
              onChange={(v) => apply({ height: v })}
              min={1}
            />
          </div>
        </Section>

        {/* Rotation */}
        <Section title="Rotation">
          <NumberInput
            label="°"
            value={isMixed(commonRotation) ? undefined : (commonRotation as number)}
            placeholder={isMixed(commonRotation) ? "Mixed" : undefined}
            onChange={(v) => apply({ rotation: v })}
            min={-180}
            max={180}
          />
        </Section>

        {/* Opacity */}
        <Section title="Opacity">
          <input
            type="range"
            min={0}
            max={100}
            value={isMixed(commonOpacity) ? 50 : (commonOpacity as number)}
            onChange={(e) =>
              apply({ opacity: parseInt(e.target.value) / 100 })
            }
            className="w-full"
          />
          <div className="text-xs text-center text-gray-500">
            {isMixed(commonOpacity) ? "Mixed" : `${commonOpacity as number}%`}
          </div>
        </Section>

        {/* Fill Color — rect, ellipse, text */}
        {hasFillNodes && (
          <Section title="Fill Color">
            <ColorInput
              value={mixedToStr(commonFill, "#000000")}
              mixed={isMixed(commonFill)}
              onChange={(v) => apply({ fill: v }, ["rect", "ellipse", "text"])}
            />
          </Section>
        )}

        {/* Stroke — rect, ellipse */}
        {hasStrokeNodes && (
          <Section title="Stroke">
            <ColorInput
              value={mixedToStr(commonStroke, "#000000")}
              mixed={isMixed(commonStroke)}
              onChange={(v) => apply({ stroke: v }, ["rect", "ellipse"])}
            />
            <NumberInput
              label="Width"
              value={isMixed(commonStrokeWidth) ? undefined : (commonStrokeWidth as number)}
              placeholder={isMixed(commonStrokeWidth) ? "Mixed" : undefined}
              onChange={(v) => apply({ strokeWidth: v }, ["rect", "ellipse"])}
              min={0}
              max={50}
            />
          </Section>
        )}

        {/* Corner Radius — rect */}
        {hasRectNodes && (
          <Section title="Corner Radius">
            <NumberInput
              label="Radius"
              value={isMixed(commonCornerRadius) ? undefined : (commonCornerRadius as number)}
              placeholder={isMixed(commonCornerRadius) ? "Mixed" : undefined}
              onChange={(v) => apply({ cornerRadius: v }, ["rect"])}
              min={0}
              max={100}
            />
          </Section>
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-600 uppercase">{title}</h3>
      {children}
    </div>
  );
}

function NumberInput({
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
    <div className="flex items-center gap-2">
      <span className="w-6 text-xs text-gray-500">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        min={min}
        max={max}
        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400 placeholder:italic"
      />
    </div>
  );
}

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
      <input
        type="color"
        value={mixed ? "#888888" : value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 border border-gray-300 rounded-md cursor-pointer"
      />
      <input
        type="text"
        value={mixed ? "" : value}
        placeholder={mixed ? "Mixed" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono placeholder:text-gray-400 placeholder:italic placeholder:font-sans"
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

  const commonText = getCommon(textNodes as Node[], (n) => (n as TextNode).text);
  const commonFontSize = getCommon(textNodes as Node[], (n) => (n as TextNode).fontSize);
  const commonFontFamily = getCommon(textNodes as Node[], (n) => (n as TextNode).fontFamily);
  const commonFontStyle = getCommon(textNodes as Node[], (n) => (n as TextNode).fontStyle || "normal");
  const commonAlign = getCommon(textNodes as Node[], (n) => (n as TextNode).align || "left");

  return (
    <>
      <Section title="Text">
        <textarea
          value={isMixed(commonText) ? "" : (commonText as string)}
          placeholder={isMixed(commonText) ? "Mixed" : undefined}
          onChange={(e) => applyText({ text: e.target.value })}
          rows={3}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none placeholder:text-gray-400 placeholder:italic"
        />
      </Section>

      <Section title="Font">
        <div className="space-y-2">
          <NumberInput
            label="Size"
            value={isMixed(commonFontSize) ? undefined : (commonFontSize as number)}
            placeholder={isMixed(commonFontSize) ? "Mixed" : undefined}
            onChange={(v) => applyText({ fontSize: v })}
            min={8}
            max={200}
          />
          <select
            value={isMixed(commonFontFamily) ? "" : (commonFontFamily as string)}
            onChange={(e) => {
              if (e.target.value) applyText({ fontFamily: e.target.value });
            }}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {isMixed(commonFontFamily) && (
              <option value="" disabled>
                Mixed
              </option>
            )}
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Georgia">Georgia</option>
            <option value="Courier New">Courier New</option>
            <option value="Verdana">Verdana</option>
          </select>
          <select
            value={isMixed(commonFontStyle) ? "" : (commonFontStyle as string)}
            onChange={(e) => {
              if (e.target.value)
                applyText({
                  fontStyle: e.target.value as "normal" | "bold" | "italic",
                });
            }}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {isMixed(commonFontStyle) && (
              <option value="" disabled>
                Mixed
              </option>
            )}
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
            <option value="italic">Italic</option>
          </select>
        </div>
      </Section>

      <Section title="Alignment">
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((align) => (
            <button
              key={align}
              onClick={() => applyText({ align })}
              className={`flex-1 py-1.5 text-sm rounded-md border ${
                !isMixed(commonAlign) && commonAlign === align
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}
