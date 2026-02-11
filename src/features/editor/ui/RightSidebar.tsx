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
 */

"use client";

import { useSelectionStore } from "../stores/selectionStore";
import { useDocStore } from "../stores/docStore";
import { editNode } from "../core/commands/edit";
import { Node, TextNode } from "../core/doc/types";

export function RightSidebar() {
  const { selectedIds } = useSelectionStore();
  const { doc } = useDocStore();

  // ดึง selected nodes
  const selectedNodes = doc?.nodes.filter((n) => selectedIds.has(n.id)) || [];

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

  // ถ้าเลือกหลายอัน
  if (selectedNodes.length > 1) {
    return (
      <aside className="flex flex-col h-full bg-white border-l border-gray-200 w-72">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Properties</h2>
          <p className="mt-1 text-xs text-gray-500">
            {selectedNodes.length} elements selected
          </p>
        </div>
        <div className="flex-1 p-4">
          <p className="text-sm text-gray-500">
            Multiple selection - common properties will be shown in future
            updates.
          </p>
        </div>
      </aside>
    );
  }

  // ถ้าเลือก 1 อัน
  const node = selectedNodes[0];

  return (
    <aside className="flex flex-col h-full overflow-y-auto bg-white border-l border-gray-200 w-72">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Properties</h2>
        <p className="mt-1 text-xs text-gray-500 capitalize">{node.type}</p>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Position */}
        <Section title="Position">
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="X"
              value={Math.round(node.x)}
              onChange={(v) => editNode(node.id, { x: v })}
            />
            <NumberInput
              label="Y"
              value={Math.round(node.y)}
              onChange={(v) => editNode(node.id, { y: v })}
            />
          </div>
        </Section>

        {/* Size */}
        <Section title="Size">
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="W"
              value={Math.round(node.width)}
              onChange={(v) => editNode(node.id, { width: v })}
              min={1}
            />
            <NumberInput
              label="H"
              value={Math.round(node.height)}
              onChange={(v) => editNode(node.id, { height: v })}
              min={1}
            />
          </div>
        </Section>

        {/* Rotation */}
        <Section title="Rotation">
          <NumberInput
            label="°"
            value={Math.round(node.rotation)}
            onChange={(v) => editNode(node.id, { rotation: v })}
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
            value={Math.round(node.opacity * 100)}
            onChange={(e) =>
              editNode(node.id, { opacity: parseInt(e.target.value) / 100 })
            }
            className="w-full"
          />
          <div className="text-xs text-center text-gray-500">
            {Math.round(node.opacity * 100)}%
          </div>
        </Section>

        {/* Fill Color - สำหรับ rect, ellipse, text */}
        {(node.type === "rect" ||
          node.type === "ellipse" ||
          node.type === "text") && (
          <Section title="Fill Color">
            <ColorInput
              value={(node as { fill?: string }).fill || "#000000"}
              onChange={(v) => editNode(node.id, { fill: v })}
            />
          </Section>
        )}

        {/* Stroke - สำหรับ rect, ellipse */}
        {(node.type === "rect" || node.type === "ellipse") && (
          <Section title="Stroke">
            <ColorInput
              value={(node as { stroke?: string }).stroke || "#000000"}
              onChange={(v) => editNode(node.id, { stroke: v })}
            />
            <NumberInput
              label="Width"
              value={(node as { strokeWidth?: number }).strokeWidth || 0}
              onChange={(v) => editNode(node.id, { strokeWidth: v })}
              min={0}
              max={50}
            />
          </Section>
        )}

        {/* Corner Radius - สำหรับ rect */}
        {node.type === "rect" && (
          <Section title="Corner Radius">
            <NumberInput
              label="Radius"
              value={(node as { cornerRadius?: number }).cornerRadius || 0}
              onChange={(v) => editNode(node.id, { cornerRadius: v })}
              min={0}
              max={100}
            />
          </Section>
        )}

        {/* Text Properties */}
        {node.type === "text" && <TextProperties node={node as TextNode} />}
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
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-xs text-gray-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 border border-gray-300 rounded-md cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
      />
    </div>
  );
}

function TextProperties({ node }: { node: TextNode }) {
  return (
    <>
      <Section title="Text">
        <textarea
          value={node.text}
          onChange={(e) => editNode(node.id, { text: e.target.value })}
          rows={3}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </Section>

      <Section title="Font">
        <div className="space-y-2">
          <NumberInput
            label="Size"
            value={node.fontSize}
            onChange={(v) => editNode(node.id, { fontSize: v })}
            min={8}
            max={200}
          />
          <select
            value={node.fontFamily}
            onChange={(e) => editNode(node.id, { fontFamily: e.target.value })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Georgia">Georgia</option>
            <option value="Courier New">Courier New</option>
            <option value="Verdana">Verdana</option>
          </select>
          <select
            value={node.fontStyle || "normal"}
            onChange={(e) =>
              editNode(node.id, {
                fontStyle: e.target.value as "normal" | "bold" | "italic",
              })
            }
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
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
              onClick={() => editNode(node.id, { align })}
              className={`flex-1 py-1.5 text-sm rounded-md border ${
                node.align === align
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
