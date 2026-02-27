/**
 * ===============================================
 * LEFT SIDEBAR - แถบเมนูฝั่งซ้าย
 * ===============================================
 *
 * รองรับการสลับ “หน้า” ภายใน sidebar เพื่อให้เพิ่มเมนู/หน้าฟีเจอร์ใหม่ได้ง่าย
 * (เช่น Elements, Page, Practice)
 */

"use client";

import { useState, useRef, useCallback } from "react";
import {
  insertRect,
  insertEllipse,
  insertText,
  insertImage,
  insertVideo,
} from "../core/commands/insert";
import { useViewStore } from "../stores/viewStore";
import { useDocStore } from "../stores/docStore";
import { useDragPreviewStore } from "../stores/dragPreviewStore";
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
        {
          id: "practice" as const,
          label: "Practice",
          title: "เลือกรูปแบบแบบฝึกหัด",
          subtitle: "เลือกประเภทแบบฝึกหัดที่ต้องการสร้าง",
          render: () => <PracticePanel />,
        },
      ] as const,
    [],
  );

  const [openPageId, setOpenPageId] = useState<LeftSidebarPageId | null>(
    pages[0].id,
  );

  const openPage =
    (openPageId ? pages.find((p) => p.id === openPageId) : null) ?? null;

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* หัวข้อ */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Elements</h2>
        <p className="text-xs text-gray-500 mt-1">
          Drag elements to canvas
        </p>
      </div>

      {/* รายการ Elements */}
      <div className="flex-1 p-3 space-y-2 overflow-auto">
        {elements.map((element) => (
          <div
            key={element.id}
            draggable={element.id !== "image" && element.id !== "video"}
            onDragStart={(e) => {
              // เก็บข้อมูล element type ไว้ใน dataTransfer
              e.dataTransfer.setData("application/element-type", element.id);
              e.dataTransfer.effectAllowed = "copy";

              // บอก dragPreviewStore ว่าเริ่มลาก element ประเภทไหน
              useDragPreviewStore.getState().startDrag(element.id);

              // สร้าง drag image เป็นรูปทรงจริง (SVG) แทน clone ของปุ่ม
              const ghost = document.createElement("canvas");
              const dpr = window.devicePixelRatio || 1;
              let gw = 150, gh = 100;
              if (element.id === "ellipse") { gw = 120; gh = 120; }
              else if (element.id === "text") { gw = 200; gh = 50; }
              ghost.width = gw * dpr;
              ghost.height = gh * dpr;
              ghost.style.width = gw + "px";
              ghost.style.height = gh + "px";
              const ctx = ghost.getContext("2d");
              if (ctx) {
                ctx.scale(dpr, dpr);
                ctx.globalAlpha = 0.7;
                if (element.id === "rect") {
                  ctx.fillStyle = "#3b82f6";
                  ctx.strokeStyle = "#1e40af";
                  ctx.lineWidth = 2;
                  ctx.fillRect(0, 0, gw, gh);
                  ctx.strokeRect(0, 0, gw, gh);
                } else if (element.id === "ellipse") {
                  ctx.fillStyle = "#10b981";
                  ctx.strokeStyle = "#059669";
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.ellipse(gw / 2, gh / 2, gw / 2, gh / 2, 0, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.stroke();
                } else if (element.id === "text") {
                  ctx.fillStyle = "#f3f4f6";
                  ctx.strokeStyle = "#9ca3af";
                  ctx.lineWidth = 1;
                  ctx.fillRect(0, 0, gw, gh);
                  ctx.strokeRect(0, 0, gw, gh);
                  ctx.fillStyle = "#000000";
                  ctx.font = "20px Arial";
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  ctx.fillText("Enter text", gw / 2, gh / 2);
                }
              }
              ghost.style.position = "absolute";
              ghost.style.top = "-9999px";
              document.body.appendChild(ghost);
              e.dataTransfer.setDragImage(ghost, gw / 2, gh / 2);
              requestAnimationFrame(() => document.body.removeChild(ghost));
            }}
            onDragEnd={() => {
              // เคลียร์ drag preview เมื่อปล่อยเมาส์
              useDragPreviewStore.getState().endDrag();
            }}
            onClick={() => handleAddElement(element.id)}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group cursor-move active:cursor-grabbing"
          >
            <div
              className={`w-10 h-10 ${element.color} rounded-lg flex items-center justify-center text-white text-xl`}
            >
              {element.icon}
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-700 group-hover:text-blue-600">
                {element.label}
              </div>
              <div className="text-xs text-gray-400">{element.description}</div>
            </div>
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
