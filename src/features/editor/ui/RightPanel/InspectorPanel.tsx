"use client";

import { useSelectionStore } from "../../stores/selectionStore";
import { useDocStore } from "../../stores/docStore";
import { editNode } from "../../core/commands/edit";
import { TextNode, RectNode } from "../../core/doc/types";

function PropertyInput({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number | string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-2">
      <label className="block text-xs font-semibold text-gray-700 mb-1">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

export function InspectorPanel() {
  const { getSelectedIds } = useSelectionStore();
  const { doc } = useDocStore();

  const selectedIds = getSelectedIds();
  if (selectedIds.length === 0) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Inspector</h3>
        <p className="text-sm text-gray-500">
          Select an element to inspect its properties.
        </p>
      </div>
    );
  }

  if (selectedIds.length > 1) {
    // Multiple selection - show only common properties (size & position)
    return (
      <div className="p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2">Inspector</h3>
        <p className="text-sm text-gray-600 mb-4 bg-blue-50 p-2 rounded">
          ({selectedIds.length} items selected) - Common properties only
        </p>
        <div className="space-y-3 border-t border-gray-200 pt-3">
          <p className="text-xs font-semibold text-gray-700">
            You can edit individual items by clicking them separately
          </p>
          <PropertyInput
            label="Rotation"
            value="-"
            onChange={() => {}}
            disabled
          />
          <PropertyInput
            label="Opacity"
            value="-"
            onChange={() => {}}
            disabled
          />
        </div>
      </div>
    );
  }

  const node = doc?.nodes.find((n) => n.id === selectedIds[0]);
  if (!node) return null;

  const handleChange = (key: string, value: any) => {
    editNode(node.id, { [key]: value });
  };

  return (
    <div className="p-4 overflow-y-auto max-h-screen">
      <h3 className="text-lg font-semibold mb-4">Inspector</h3>

      <div className="space-y-3">
        {/* Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Type
          </label>
          <p className="text-sm text-gray-900 capitalize bg-gray-50 px-2 py-1 rounded">
            {node.type}
          </p>
        </div>

        {/* Position & Size Section */}
        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Position & Size
          </p>
          <PropertyInput
            label="X"
            value={Math.round(node.x)}
            onChange={(v) => handleChange("x", parseFloat(v))}
          />
          <PropertyInput
            label="Y"
            value={Math.round(node.y)}
            onChange={(v) => handleChange("y", parseFloat(v))}
          />
          <PropertyInput
            label="Width"
            value={Math.round(node.width)}
            onChange={(v) => handleChange("width", parseFloat(v))}
          />
          <PropertyInput
            label="Height"
            value={Math.round(node.height)}
            onChange={(v) => handleChange("height", parseFloat(v))}
          />
        </div>

        {/* Transform Section */}
        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Transform</p>
          <PropertyInput
            label="Rotation"
            value={Math.round(node.rotation)}
            onChange={(v) => handleChange("rotation", parseFloat(v))}
          />
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Opacity
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={node.opacity}
              onChange={(e) =>
                handleChange("opacity", parseFloat(e.target.value))
              }
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(node.opacity * 100)}%
            </p>
          </div>
        </div>

        {/* Fill Color - for rect/ellipse */}
        {(node.type === "rect" || node.type === "ellipse") && (
          <div className="border-t border-gray-200 pt-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Appearance
            </p>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Fill Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={(node as RectNode).fill || "#3b82f6"}
                onChange={(e) => handleChange("fill", e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={(node as RectNode).fill || "#3b82f6"}
                onChange={(e) => handleChange("fill", e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        )}

        {/* Text properties */}
        {node.type === "text" && (
          <div className="border-t border-gray-200 pt-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Text Properties
            </p>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Content (double-click to edit inline)
            </label>
            <textarea
              value={(node as TextNode).text}
              onChange={(e) => handleChange("text", e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded font-mono text-xs"
              rows={3}
              placeholder="Text content..."
            />
            <PropertyInput
              label="Font Size"
              value={(node as TextNode).fontSize}
              onChange={(v) => handleChange("fontSize", parseFloat(v))}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Font Family
              </label>
              <select
                value={(node as TextNode).fontFamily}
                onChange={(e) => handleChange("fontFamily", e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option>Arial</option>
                <option>Helvetica</option>
                <option>Times New Roman</option>
                <option>Courier New</option>
                <option>Georgia</option>
                <option>Verdana</option>
              </select>
            </div>
            <div className="mt-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Text Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={(node as TextNode).fill}
                  onChange={(e) => handleChange("fill", e.target.value)}
                  className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={(node as TextNode).fill}
                  onChange={(e) => handleChange("fill", e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
