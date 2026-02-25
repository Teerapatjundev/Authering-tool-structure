/**
 * ===============================================
 * LEFT SIDEBAR - แผงเพิ่ม Elements
 * ===============================================
 *
 * แสดง elements ที่สามารถลากมาวางบน canvas:
 * - Rectangle (ลากหรือคลิกเพื่อเพิ่ม)
 * - Ellipse / Circle (ลากหรือคลิกเพื่อเพิ่ม)
 * - Text (ลากหรือคลิกเพื่อเพิ่ม)
 * - Image (อัปโหลดไฟล์ หรือ ลากรูปมาวาง)
 * - Video (YouTube URL)
 * 
 * การใช้งาน:
 * - ลาก element ไปวางบน canvas เพื่อสร้างที่ตำแหน่งที่ต้องการ
 * - หรือคลิกเพื่อสร้างตรงกลาง document
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

// ประเภท element ที่เพิ่มได้
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

/**
 * ดึง YouTube Video ID จาก URL
 * รองรับ: youtube.com/watch?v=xxx, youtu.be/xxx, youtube.com/embed/xxx
 */
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

export function LeftSidebar() {
  const { canvasSize, viewport } = useViewStore();
  const { doc } = useDocStore();
  const [videoUrl, setVideoUrl] = useState("");
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // คำนวณตำแหน่งกลางของ document (กระดาษ)
  const getCenterPos = () => {
    // ใช้กลาง document แทน viewport
    if (doc) {
      return { x: doc.width / 2, y: doc.height / 2 };
    }
    // fallback ถ้าไม่มี doc
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

  // อ่านไฟล์ภาพและแปลงเป็น Base64 URL
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
    [canvasSize, viewport],
  );

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  // Handle drag events
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

  // Handle YouTube video
  const handleAddVideo = () => {
    const youtubeId = extractYouTubeId(videoUrl.trim());
    if (youtubeId) {
      const { x, y } = getCenterPos();
      // เก็บ YouTube ID ไว้ใน src
      insertVideo(x, y, youtubeId);
      setVideoUrl("");
      setShowVideoInput(false);
    } else {
      alert("Please enter a valid YouTube URL");
    }
  };

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
              
              // สร้าง ghost image สำหรับ drag cursor
              const ghostElement = e.currentTarget.cloneNode(true) as HTMLElement;
              ghostElement.style.opacity = "0.5";
              ghostElement.style.position = "absolute";
              ghostElement.style.top = "-1000px";
              document.body.appendChild(ghostElement);
              e.dataTransfer.setDragImage(ghostElement, 0, 0);
              setTimeout(() => document.body.removeChild(ghostElement), 0);
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

      {/* Image Upload Area */}
      {showImageUpload && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Image:
          </label>

          {/* Drag & Drop Area */}
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

      {/* YouTube Video Input */}
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

      {/* Keyboard Shortcuts */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs font-semibold text-gray-600 mb-2">
          Shortcuts
        </div>
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
    </aside>
  );
}
