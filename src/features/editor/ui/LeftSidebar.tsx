/**
 * ===============================================
 * LEFT SIDEBAR - แถบเมนูฝั่งซ้าย
 * ===============================================
 *
 * รองรับการสลับ “หน้า” ภายใน sidebar เพื่อให้เพิ่มเมนู/หน้าฟีเจอร์ใหม่ได้ง่าย
 * (เช่น Elements, Page, Practice)
 */

"use client";

import { useMemo, useState } from "react";
import { ElementsPanel } from "@/features/editor/ui/leftSidebar/ElementsPanel";
import { PagePanel } from "@/features/editor/ui/leftSidebar/PagePanel";
import { PracticePanel } from "@/features/editor/ui/leftSidebar/PracticePanel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  LayoutGrid,
  FileText,
  PenSquare,
  Pen,
} from "lucide-react";
import { ToolPanel } from "./leftSidebar/ToolPanel";

type LeftSidebarPageId = "elements" | "page" | "practice" | "tool";

export function LeftSidebar() {
  const pages = useMemo(
    () =>
      [
        {
          id: "practice" as const,
          label: "Practice",
          title: "เลือกรูปแบบแบบฝึกหัด",
          subtitle: "เลือกประเภทแบบฝึกหัดที่ต้องการสร้าง",
          render: () => <PracticePanel />,
        },
        {
          id: "elements" as const,
          label: "Elements",
          title: "Elements",
          subtitle: "Drag elements to canvas",
          icon: LayoutGrid,
          render: () => <ElementsPanel />,
        },

        {
          id: "page" as const,
          label: "Page",
          title: "Page",
          subtitle: "Page tools (coming soon)",
          icon: FileText,
          render: () => <PagePanel />,
        },
        {
          id: "practice" as const,
          label: "Practice",
          title: "เลือกรูปแบบแบบฝึกหัด",
          subtitle: "เลือกประเภทแบบฝึกหัดที่ต้องการสร้าง",
          icon: PenSquare,
          render: () => <PracticePanel />,
        },
        {
          id: "tool" as const,
          label: "Tool",
          title: "Tool",
          subtitle: "Tool panel",
          icon: Pen,
          render: () => <ToolPanel />,
        },
      ] as const,
    [],
  );

  // Default: no panel selected/open when entering the editor.
  const [openPageId, setOpenPageId] = useState<LeftSidebarPageId | null>(null);

  const openPage =
    (openPageId ? pages.find((p) => p.id === openPageId) : null) ?? null;

  return (
    <aside className="flex h-full">
      {/* Button strip (always visible) */}
      <div className="flex flex-col items-center w-16 h-full py-2 bg-white border-r border-gray-200">
        <TooltipProvider delayDuration={100}>
          <div className="flex flex-col gap-2">
            {pages.map((p) => {
              const isActive = p.id === openPageId;
              const Icon = p.icon;
              return (
                <Tooltip key={p.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={p.label}
                      onClick={() =>
                        setOpenPageId((curr) => (curr === p.id ? null : p.id))
                      }
                      className={
                        "flex items-center justify-center w-10 h-10 transition-colors " +
                        (isActive
                          ? "bg-blue-50 border-blue-300 text-blue-700"
                          : " border-gray-200 text-gray-600 hover:bg-gray-50")
                      }
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{p.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Tab panel (togglable) */}
      {openPage && (
        <div className="relative h-full">
          <div className="flex flex-col w-72 h-full overflow-hidden bg-white border-r border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">{openPage.title}</h2>
              <p className="mt-1 text-xs text-gray-500">{openPage.subtitle}</p>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              {openPage.render()}
            </div>
          </div>

          <button
            type="button"
            aria-label="Collapse left panel"
            onClick={() => setOpenPageId(null)}
            className="absolute z-10 flex items-center justify-center w-6 h-20 -translate-y-1/2 bg-white border border-gray-200 rounded-full -right-4 top-1/2 text-gray-500 hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
