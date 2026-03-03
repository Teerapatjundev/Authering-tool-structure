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

type LeftSidebarPageId = "elements" | "page" | "practice";

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
          render: () => <ElementsPanel />,
        },

        {
          id: "page" as const,
          label: "Page",
          title: "Page",
          subtitle: "Page tools (coming soon)",
          render: () => <PagePanel />,
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
      <div className="flex flex-col w-40 h-full bg-white border-r border-gray-200">
        <div className="p-2 border-b border-gray-100">
          <div className="flex flex-col gap-2">
            {pages.map((p) => {
              const isActive = p.id === openPageId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setOpenPageId((curr) => (curr === p.id ? null : p.id))
                  }
                  className={
                    "w-full px-2 py-1 text-xs rounded-md border transition-colors " +
                    (isActive
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50")
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab panel (togglable) */}
      {openPage && (
        <div className="flex flex-col w-64 h-full overflow-hidden bg-white border-r border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">{openPage.title}</h2>
            <p className="mt-1 text-xs text-gray-500">{openPage.subtitle}</p>
          </div>

          <div className="flex flex-col flex-1 overflow-hidden">
            {openPage.render()}
          </div>
        </div>
      )}
    </aside>
  );
}
