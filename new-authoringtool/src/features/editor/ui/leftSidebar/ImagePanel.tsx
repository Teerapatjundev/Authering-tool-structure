/**
 * ===============================================
 * IMAGE PANEL - หน้าเพิ่ม Image
 * ===============================================
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { insertImage } from "../../core/commands/insert";
import { useDocStore } from "../../stores/docStore";
import { useViewStore } from "../../stores/viewStore";

export function ImagePanel() {
  const { canvasSize, viewport } = useViewStore();
  const { doc } = useDocStore();
  const activePage =
    doc?.pages.find((p) => p.id === doc.activePageId) ?? doc?.pages[0] ?? null;

  const [isDragging, setIsDragging] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const getCenterPos = () => {
    if (activePage) {
      return { x: activePage.width / 2, y: activePage.height / 2 };
    }
    const centerX = (-viewport.x + canvasSize.width / 2) / viewport.zoom;
    const centerY = (-viewport.y + canvasSize.height / 2) / viewport.zoom;
    return { x: centerX, y: centerY };
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
        }
      };
      reader.readAsDataURL(file);
    },
    [doc, canvasSize.width, canvasSize.height, viewport.x, viewport.y, viewport.zoom],
  );

  const handleMediaDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMediaDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="flex-1 p-3 overflow-auto">
      <div className="text-sm font-semibold text-gray-800 mb-3">เพิ่มรูปภาพ</div>

      <div
        onDragOver={handleMediaDragOver}
        onDragLeave={handleMediaDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleImageFile(file);
        }}
        onClick={() => imageInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-100"
        }`}
      >
        <div className="text-4xl mb-2">🖼</div>
        <p className="text-sm text-gray-600">
          {isDragging ? "Drop image here" : "Click or drag image here"}
        </p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, SVG</p>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
        }}
        className="hidden"
      />
    </div>
  );
}
