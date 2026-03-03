/**
 * ===============================================
 * ELEMENTS PANEL - หน้ารายการ Elements
 * ===============================================
 *
 * แสดง elements ที่สามารถลากมาวางบน canvas:
 * - Rectangle (ลากหรือคลิกเพื่อเพิ่ม)
 * - Ellipse / Circle (ลากหรือคลิกเพื่อเพิ่ม)
 * - Text (ลากหรือคลิกเพื่อเพิ่ม)
 * - Image (อัปโหลดไฟล์ หรือ ลากรูปมาวาง)
 * - Video (YouTube URL)
 */

"use client";

import { useCallback, useRef, useState } from "react";
import {
  insertEllipse,
  insertImage,
  insertRect,
  insertText,
  insertVideo,
} from "../../core/commands/insert";
import { useDocStore } from "../../stores/docStore";
import { useViewStore } from "../../stores/viewStore";
import { useDragPreviewStore } from "../../stores/dragPreviewStore";

interface ElementType {
  id: string;
  icon: string;
  label: string;
  color: string;
  description: string;
}

const elements: ElementType[] = [
  {
    id: "rect",
    icon: "□",
    label: "Rectangle",
    color: "bg-blue-500",
    description: "Add rectangle",
  },
  {
    id: "ellipse",
    icon: "○",
    label: "Ellipse",
    color: "bg-green-500",
    description: "Add ellipse",
  },
  {
    id: "text",
    icon: "T",
    label: "Text",
    color: "bg-purple-500",
    description: "Add text",
  },
  {
    id: "image",
    icon: "🖼",
    label: "Image",
    color: "bg-amber-500",
    description: "Upload or drag",
  },
  {
    id: "video",
    icon: "▶",
    label: "YouTube",
    color: "bg-red-500",
    description: "Add YouTube video",
  },
];

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function ElementsPanel() {
  const { canvasSize, viewport } = useViewStore();
  const { doc } = useDocStore();

  const [videoUrl, setVideoUrl] = useState("");
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCenterPos = () => {
    if (doc) {
      return { x: doc.width / 2, y: doc.height / 2 };
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
      case "text":
        insertText(x, y, "Enter text");
        break;
      case "image":
        setShowImageUpload(true);
        break;
      case "video":
        setShowVideoInput(true);
        break;
    }
  };

  const handleImageFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          const { x, y } = getCenterPos();
          insertImage(x, y, result);
          setShowImageUpload(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [doc, canvasSize.width, canvasSize.height, viewport.x, viewport.y, viewport.zoom],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleAddVideo = () => {
    const youtubeId = extractYouTubeId(videoUrl.trim());
    if (youtubeId) {
      const { x, y } = getCenterPos();
      insertVideo(x, y, youtubeId);
      setVideoUrl("");
      setShowVideoInput(false);
    } else {
      alert("Please enter a valid YouTube URL");
    }
  };

  return (
    <>
      <div className="flex-1 p-3 space-y-2 overflow-auto">
        {elements.map((element) => (
          <div
            key={element.id}
            draggable={element.id !== "image" && element.id !== "video"}
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
              } else if (element.id === "text") {
                ghostWidth = 200;
                ghostHeight = 50;
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
                }
              }

              ghost.style.position = "absolute";
              ghost.style.top = "-9999px";
              document.body.appendChild(ghost);
              e.dataTransfer.setDragImage(ghost, ghostWidth / 2, ghostHeight / 2);
              requestAnimationFrame(() => {
                document.body.removeChild(ghost);
              });
            }}
            onDragEnd={() => {
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
          </div>
        ))}
      </div>

      {showImageUpload && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Image:
          </label>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
              ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-100"
              }
            `}
          >
            <div className="text-3xl mb-2">📁</div>
            <p className="text-sm text-gray-600">
              {isDragging ? "Drop image here" : "Click or drag image here"}
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, SVG</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => setShowImageUpload(false)}
            className="w-full mt-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-md"
          >
            Cancel
          </button>
        </div>
      )}

      {showVideoInput && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            YouTube URL:
          </label>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Supports: youtube.com/watch?v=, youtu.be/
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAddVideo}
              className="flex-1 px-3 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Add YouTube
            </button>
            <button
              onClick={() => setShowVideoInput(false)}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs font-semibold text-gray-600 mb-2">Shortcuts</div>
        <div className="space-y-1 text-xs text-gray-500">
          <div>
            <kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl+Z</kbd> Undo
          </div>
          <div>
            <kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl+Y</kbd> Redo
          </div>
          <div>
            <kbd className="px-1 py-0.5 bg-gray-200 rounded">Del</kbd> Delete
          </div>
          <div>
            <kbd className="px-1 py-0.5 bg-gray-200 rounded">Double-click</kbd>{" "}
            Edit text
          </div>
        </div>
      </div>
    </>
  );
}
