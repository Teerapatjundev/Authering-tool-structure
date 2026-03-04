"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToolStore } from "../../stores/toolStore";
import { Eraser, Highlighter, PenTool } from "lucide-react";

const DRAW_TOOLS = [
  {
    id: "pen" as const,
    label: "Pen",
    shortcut: "P",
    icon: PenTool,
  },
  {
    id: "highlighter" as const,
    label: "Highlight",
    shortcut: "I",
    icon: Highlighter,
  },
  {
    id: "eraser" as const,
    label: "Eraser",
    shortcut: "E",
    icon: Eraser,
  },
];

export function ToolPanel() {
  const {
    activeTool,
    setTool,
    penColor,
    setPenColor,
    penStrokeWidth,
    setPenStrokeWidth,
    highlighterColor,
    setHighlighterColor,
    highlighterStrokeWidth,
    setHighlighterStrokeWidth,
  } = useToolStore();

  return (
    <div className="flex-1 p-3 overflow-auto">
      <div className="space-y-3">
        <div className="p-1 bg-gray-100 border border-gray-200 rounded-xl">
          <div className="grid grid-cols-3 gap-1">
            {DRAW_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;

              return (
                <Button
                  key={tool.id}
                  type="button"
                  variant="ghost"
                  onClick={() => setTool(tool.id)}
                  className={
                    "h-auto flex-col gap-1.5 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors " +
                    (isActive
                      ? "bg-blue-500 text-white hover:bg-blue-500"
                      : "text-gray-700 hover:bg-white")
                  }
                  title={`${tool.label} (${tool.shortcut})`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tool.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {activeTool === "pen" && (
          <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-3">
            <div className="text-xs font-semibold text-gray-700">Pen Settings</div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  className="h-8 w-10 rounded border border-gray-300 bg-transparent cursor-pointer"
                  aria-label="Pen color"
                />
                <span className="text-xs text-gray-500 font-mono">{penColor}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Thickness</Label>
              <Slider
                min={1}
                max={50}
                step={1}
                value={[penStrokeWidth]}
                onValueChange={([v]) => setPenStrokeWidth(v)}
              />
              <div className="text-xs text-gray-500">{penStrokeWidth}px</div>
            </div>
          </div>
        )}

        {activeTool === "highlighter" && (
          <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-3">
            <div className="text-xs font-semibold text-gray-700">
              Highlighter Settings
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={highlighterColor}
                  onChange={(e) => setHighlighterColor(e.target.value)}
                  className="h-8 w-10 rounded border border-gray-300 bg-transparent cursor-pointer"
                  aria-label="Highlighter color"
                />
                <span className="text-xs text-gray-500 font-mono">
                  {highlighterColor}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Thickness</Label>
              <Slider
                min={1}
                max={80}
                step={1}
                value={[highlighterStrokeWidth]}
                onValueChange={([v]) => setHighlighterStrokeWidth(v)}
              />
              <div className="text-xs text-gray-500">{highlighterStrokeWidth}px</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
