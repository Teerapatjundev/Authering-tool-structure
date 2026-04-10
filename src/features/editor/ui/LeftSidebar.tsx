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
import { PagePanel } from "@/features/editor/ui/leftSidebar/PagePanel";
import { PracticePanel } from "@/features/editor/ui/leftSidebar/PracticePanel";
import { ControlsPanel } from "@/features/editor/ui/leftSidebar/ControlsPanel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  FileText,
  PenSquare,
  ListChecks,
  Pen,
  PlayCircleIcon,
  Square,
  Image,
  Layers2,
} from "lucide-react";
import { ToolPanel } from "./leftSidebar/ToolPanel";
import { ElementsPanel } from "./leftSidebar/ElementsPanel";
import { VideoPanel } from "./leftSidebar/VideoPanel";
import { ImagePanel } from "./leftSidebar/ImagePanel";
import { LayoutPanel } from "./leftSidebar/LayoutPanel";
import { useDocStore } from "../stores/docStore";
import { useToolStore } from "../stores/toolStore";

type LeftSidebarPageId =
  | "elements"
  | "page"
  | "practice"
  | "controls"
  | "tool"
  | "video"
  | "image"
  | "layout";

function PracticeIcon(props: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.19 12.15C12.3567 11.9833 12.44 11.7867 12.44 11.56C12.44 11.3333 12.3567 11.1367 12.19 10.97C12.0233 10.8033 11.8267 10.72 11.6 10.72C11.3733 10.72 11.1767 10.8033 11.01 10.97C10.8433 11.1367 10.76 11.3333 10.76 11.56C10.76 11.7867 10.8433 11.9833 11.01 12.15C11.1767 12.3167 11.3733 12.4 11.6 12.4C11.8267 12.4 12.0233 12.3167 12.19 12.15ZM11 9.84H12.2C12.2 9.45333 12.24 9.17 12.32 8.99C12.4 8.81 12.5867 8.57333 12.88 8.28C13.28 7.88 13.5467 7.55667 13.68 7.31C13.8133 7.06333 13.88 6.77333 13.88 6.44C13.88 5.84 13.67 5.35 13.25 4.97C12.83 4.59 12.28 4.4 11.6 4.4C11.0533 4.4 10.5767 4.55333 10.17 4.86C9.76333 5.16667 9.48 5.57333 9.32 6.08L10.4 6.52C10.52 6.18667 10.6833 5.93667 10.89 5.77C11.0967 5.60333 11.3333 5.52 11.6 5.52C11.92 5.52 12.18 5.61 12.38 5.79C12.58 5.97 12.68 6.21333 12.68 6.52C12.68 6.70667 12.6267 6.88333 12.52 7.05C12.4133 7.21667 12.2267 7.42667 11.96 7.68C11.52 8.06667 11.25 8.37 11.15 8.59C11.05 8.81 11 9.22667 11 9.84ZM6.8 14.8C6.36 14.8 5.98333 14.6433 5.67 14.33C5.35667 14.0167 5.2 13.64 5.2 13.2V3.6C5.2 3.16 5.35667 2.78333 5.67 2.47C5.98333 2.15667 6.36 2 6.8 2H16.4C16.84 2 17.2167 2.15667 17.53 2.47C17.8433 2.78333 18 3.16 18 3.6V13.2C18 13.64 17.8433 14.0167 17.53 14.33C17.2167 14.6433 16.84 14.8 16.4 14.8H6.8ZM6.8 13.2H16.4V3.6H6.8V13.2ZM3.6 18C3.16 18 2.78333 17.8433 2.47 17.53C2.15667 17.2167 2 16.84 2 16.4V5.2H3.6V16.4H14.8V18H3.6Z"
        fill="currentColor"
      />
    </svg>
  );
}
function Icon(props: { className?: string }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 28V26.2222H22.6667V28H12ZM12 24.4444V22.6667H28V24.4444H12ZM13.7778 20.8889C13.2889 20.8889 12.8704 20.7148 12.5222 20.3667C12.1741 20.0185 12 19.6 12 19.1111V13.7778C12 13.2889 12.1741 12.8704 12.5222 12.5222C12.8704 12.1741 13.2889 12 13.7778 12H26.2222C26.7111 12 27.1296 12.1741 27.4778 12.5222C27.8259 12.8704 28 13.2889 28 13.7778V19.1111C28 19.6 27.8259 20.0185 27.4778 20.3667C27.1296 20.7148 26.7111 20.8889 26.2222 20.8889H13.7778ZM13.7778 19.1111H26.2222V13.7778H13.7778V19.1111Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LeftSidebar() {
  const { setTool } = useToolStore();
  const { doc } = useDocStore();
  const pageCount = doc?.pages.length ?? 0;

  const pages = useMemo(
    () =>
      [
        {
          id: "page" as const,
          label: "Page",
          title: "Page",
          subtitle: `หน้าทั้งหมด(${pageCount})`,
          icon: FileText,
          render: () => <PagePanel />,
        },
        {
          id: "practice" as const,
          label: "Practice",
          title: "เลือกรูปแบบแบบฝึกหัด",
          subtitle: "เลือกประเภทแบบฝึกหัดที่ต้องการสร้าง",
          icon: PracticeIcon,
          render: () => <PracticePanel />,
        },
        {
          id: "video" as const,
          label: "Video",
          title: "เลือกรูปแบบวิดีโอ",
          subtitle: "เลือกประเภทวิดีโอที่ต้องการสร้าง",
          icon: PlayCircleIcon,
          render: () => <VideoPanel />,
        },
        {
          id: "elements" as const,
          label: "Elements",
          title: "Elements",
          subtitle: "Drag elements to canvas",
          icon: Square,
          render: () => <ElementsPanel />,
        },
        {
          id: "image" as const,
          label: "Image",
          title: "Image",
          subtitle: "เพิ่มรูปภาพลงใน canvas",
          icon: Image,
          render: () => <ImagePanel />,
        },
        {
          id: "controls" as const,
          label: "Controls",
          title: "Exercise Controls",
          subtitle: "Submit button, restart button, timer",
          icon: Icon,
          render: () => <ControlsPanel />,
        },
        {
          id: "layout" as const,
          label: "Layout",
          title: "Layout",
          // subtitle: "Layout panel",
          icon: Layers2,
          render: () => <LayoutPanel />,
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
    [pageCount],
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
                      onClick={() => {
                        setOpenPageId((curr) => (curr === p.id ? null : p.id));
                        setTool("select");
                      }}
                      className={
                        "flex items-center justify-center w-10 h-10 transition-colors rounded-md " +
                        (isActive
                          ? "bg-[#FFE5E6] text-[#ED1C24]"
                          : "text-gray-600 hover:bg-[#FFE5E6] hover:text-[#ED1C24]")
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
          <div className="flex flex-col h-full overflow-hidden bg-white border-r border-gray-200 w-72">
            <div className="px-4 py-3 border-gray-100">
              <h2 className="font-semibold text-gray-800">{openPage.title}</h2>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              {openPage.render()}
            </div>
          </div>

          <button
            type="button"
            aria-label="Collapse left panel"
            onClick={() => setOpenPageId(null)}
            className="absolute z-10 flex items-center justify-center w-6 h-20 text-gray-500 -translate-y-1/2 bg-white border border-gray-200 rounded-full -right-4 top-1/2 hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
