/**
 * ===============================================
 * ELEMENTS PANEL - หน้ารายการ Elements
 * ===============================================
 */

"use client";

import { useCallback, useRef, useState } from "react";
import {
  insertAccordion,
  insertAudio,
  insertEllipse,
  insertPentagon,
  insertRect,
  insertText,
  insertTextLink,
  insertTriangle,
} from "../../core/commands/insert";
import { useDocStore } from "../../stores/docStore";
import { useViewStore } from "../../stores/viewStore";
import { useDragPreviewStore } from "../../stores/dragPreviewStore";

interface ElementType {
  id: string;
  icon: string;
  label: string;
  description: string;
}

const elements: ElementType[] = [
  { id: "rect", icon: "□", label: "Rectangle", description: "Add rectangle" },
  { id: "ellipse", icon: "○", label: "Ellipse", description: "Add ellipse" },
  { id: "triangle", icon: "△", label: "Triangle", description: "Add triangle" },
  { id: "pentagon", icon: "⬟", label: "Pentagon", description: "Add pentagon" },
  { id: "text", icon: "T", label: "Text", description: "Add text" },
  {
    id: "textlink",
    icon: "🔗",
    label: "Textlink",
    description: "Add URL text",
  },
  { id: "audio", icon: "🔊", label: "Audio", description: "Upload audio file" },
  {
    id: "accordion",
    icon: "📂",
    label: "Accordion",
    description: "Add accordion",
  },
];

export function ElementsPanel() {
  const { canvasSize, viewport } = useViewStore();
  const { doc } = useDocStore();
  const activePage =
    doc?.pages.find((p) => p.id === doc.activePageId) ?? doc?.pages[0] ?? null;

  const [textLinkUrl, setTextLinkUrl] = useState("");
  const [showAudioUpload, setShowAudioUpload] = useState(false);
  const [showTextLinkInput, setShowTextLinkInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const audioInputRef = useRef<HTMLInputElement>(null);

  const getCenterPos = () => {
    if (activePage) {
      return { x: activePage.width / 2, y: activePage.height / 2 };
    }
    const centerX = (-viewport.x + canvasSize.width / 2) / viewport.zoom;
    const centerY = (-viewport.y + canvasSize.height / 2) / viewport.zoom;
    return { x: centerX, y: centerY };
  };

  const handleAddElement = (elementId: string) => {
    const { x, y } = getCenterPos();

    switch (elementId) {
      case "rect":
        insertRect(x, y, 150, 100);
        break;
      case "ellipse":
        insertEllipse(x, y, 120, 120);
        break;
      case "triangle":
        insertTriangle(x, y, 140, 120);
        break;
      case "pentagon":
        insertPentagon(x, y, 140, 140);
        break;
      case "text":
        insertText(x, y, "Enter text");
        break;
      case "textlink":
        setShowTextLinkInput(true);
        break;
      case "audio":
        setShowAudioUpload(true);
        break;
      case "accordion":
        insertAccordion(x, y);
        break;
    }
  };

  const handleAudioFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("audio/")) {
        alert("Please select an audio file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          const { x, y } = getCenterPos();
          insertAudio(x, y, result, file.name);
          setShowAudioUpload(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [
      doc,
      canvasSize.width,
      canvasSize.height,
      viewport.x,
      viewport.y,
      viewport.zoom,
    ],
  );

  const handleAddTextLink = () => {
    const url = textLinkUrl.trim();
    if (!url) {
      alert("Please enter a URL");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      alert("URL must start with http:// or https://");
      return;
    }

    const { x, y } = getCenterPos();
    insertTextLink(x, y, url);
    setTextLinkUrl("");
    setShowTextLinkInput(false);
  };

  const handleMediaDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMediaDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <>
      <div className="flex-1 p-3 overflow-auto">
        <div className="text-sm font-semibold text-gray-800">
          เลือกองค์ประกอบ
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {elements.map((element) => (
            <div
              key={element.id}
              draggable={
                element.id !== "image" &&
                element.id !== "video" &&
                element.id !== "audio"
              }
              onDragStart={(e) => {
                e.dataTransfer.setData("application/element-type", element.id);
                e.dataTransfer.effectAllowed = "copy";

                useDragPreviewStore.getState().startDrag(element.id);

                const ghost = document.createElement("canvas");
                const dpr = window.devicePixelRatio || 1;
                let ghostWidth = 150;
                let ghostHeight = 100;

                if (element.id === "ellipse") {
                  ghostWidth = 120;
                  ghostHeight = 120;
                } else if (element.id === "triangle") {
                  ghostWidth = 140;
                  ghostHeight = 120;
                } else if (element.id === "pentagon") {
                  ghostWidth = 140;
                  ghostHeight = 140;
                } else if (element.id === "text") {
                  ghostWidth = 200;
                  ghostHeight = 50;
                } else if (element.id === "textlink") {
                  ghostWidth = 280;
                  ghostHeight = 40;
                }

                ghost.width = ghostWidth * dpr;
                ghost.height = ghostHeight * dpr;
                ghost.style.width = `${ghostWidth}px`;
                ghost.style.height = `${ghostHeight}px`;

                const ctx = ghost.getContext("2d");
                if (ctx) {
                  ctx.scale(dpr, dpr);
                  ctx.globalAlpha = 0.7;

                  if (element.id === "rect") {
                    ctx.fillStyle = "#3b82f6";
                    ctx.strokeStyle = "#1e40af";
                    ctx.lineWidth = 2;
                    ctx.fillRect(0, 0, ghostWidth, ghostHeight);
                    ctx.strokeRect(0, 0, ghostWidth, ghostHeight);
                  } else if (element.id === "ellipse") {
                    ctx.fillStyle = "#10b981";
                    ctx.strokeStyle = "#059669";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.ellipse(
                      ghostWidth / 2,
                      ghostHeight / 2,
                      ghostWidth / 2,
                      ghostHeight / 2,
                      0,
                      0,
                      Math.PI * 2,
                    );
                    ctx.fill();
                    ctx.stroke();
                  } else if (element.id === "triangle") {
                    ctx.fillStyle = "#3b82f6";
                    ctx.strokeStyle = "#1e40af";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(ghostWidth / 2, 6);
                    ctx.lineTo(ghostWidth - 6, ghostHeight - 6);
                    ctx.lineTo(6, ghostHeight - 6);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                  } else if (element.id === "pentagon") {
                    ctx.fillStyle = "#8b5cf6";
                    ctx.strokeStyle = "#6d28d9";
                    ctx.lineWidth = 2;
                    const cx = ghostWidth / 2;
                    const cy = ghostHeight / 2;
                    const r = Math.min(ghostWidth, ghostHeight) / 2 - 6;
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                      const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5;
                      const px = cx + r * Math.cos(angle);
                      const py = cy + r * Math.sin(angle);
                      if (i === 0) ctx.moveTo(px, py);
                      else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                  } else if (element.id === "text") {
                    ctx.fillStyle = "#f3f4f6";
                    ctx.strokeStyle = "#9ca3af";
                    ctx.lineWidth = 1;
                    ctx.fillRect(0, 0, ghostWidth, ghostHeight);
                    ctx.strokeRect(0, 0, ghostWidth, ghostHeight);
                    ctx.fillStyle = "#000000";
                    ctx.font = "20px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("Enter text", ghostWidth / 2, ghostHeight / 2);
                  } else if (element.id === "textlink") {
                    ctx.fillStyle = "#f3f4f6";
                    ctx.strokeStyle = "#9ca3af";
                    ctx.lineWidth = 1;
                    ctx.fillRect(0, 0, ghostWidth, ghostHeight);
                    ctx.strokeRect(0, 0, ghostWidth, ghostHeight);
                    ctx.fillStyle = "#2563eb";
                    ctx.font = "18px Arial";
                    ctx.textAlign = "left";
                    ctx.textBaseline = "middle";
                    ctx.fillText("https://example.com", 12, ghostHeight / 2);
                  }
                }

                ghost.style.position = "absolute";
                ghost.style.top = "-9999px";
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(
                  ghost,
                  ghostWidth / 2,
                  ghostHeight / 2,
                );
                requestAnimationFrame(() => {
                  document.body.removeChild(ghost);
                });
              }}
              onDragEnd={() => {
                useDragPreviewStore.getState().endDrag();
              }}
              onClick={() => handleAddElement(element.id)}
              className={
                "p-3 transition-colors bg-white border border-gray-200 rounded-lg active:cursor-grabbing hover:bg-gray-50 " +
                (element.id !== "image" &&
                element.id !== "video" &&
                element.id !== "audio"
                  ? "cursor-move"
                  : "cursor-pointer")
              }
            >
              <div className="flex flex-col gap-2 text-center">
                <div className="w-full px-1">
                  <div className="flex items-center justify-center w-full mx-auto text-2xl text-gray-600 bg-gray-200 border border-gray-300 rounded-sm aspect-square">
                    {element.icon}
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-800">
                  {element.label}
                </div>
              </div>
              <div className="mt-1 text-xs text-center text-gray-500">
                {element.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAudioUpload && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Audio:
          </label>
          <div
            onDragOver={handleMediaDragOver}
            onDragLeave={handleMediaDragLeave}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleAudioFile(file);
            }}
            onClick={() => audioInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-gray-100"
            }`}
          >
            <div className="text-3xl mb-2">🎵</div>
            <p className="text-sm text-gray-600">
              {isDragging ? "Drop audio here" : "Click or drag audio here"}
            </p>
            <p className="text-xs text-gray-400 mt-1">MP3, WAV, OGG, M4A</p>
          </div>

          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAudioFile(file);
            }}
            className="hidden"
          />

          <button
            onClick={() => setShowAudioUpload(false)}
            className="w-full mt-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-md"
          >
            Cancel
          </button>
        </div>
      )}

      {showTextLinkInput && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Textlink URL:
          </label>
          <input
            type="text"
            value={textLinkUrl}
            onChange={(e) => setTextLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Supports: http:// or https://
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAddTextLink}
              className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Add Textlink
            </button>
            <button
              onClick={() => setShowTextLinkInput(false)}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
