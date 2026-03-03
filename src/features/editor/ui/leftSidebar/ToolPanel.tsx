"use client";

import { Button } from "@/components/ui/button";
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
  const { activeTool, setTool } = useToolStore();

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
      </div>
    </div>
  );
}
