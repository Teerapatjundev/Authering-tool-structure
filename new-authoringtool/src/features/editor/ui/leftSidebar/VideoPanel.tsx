/**
 * ===============================================
 * VIDEO PANEL - หน้าเพิ่ม Video
 * ===============================================
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { insertVideo } from "../../core/commands/insert";
import { useDocStore } from "../../stores/docStore";
import { useViewStore } from "../../stores/viewStore";

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

export function VideoPanel() {
  const { canvasSize, viewport } = useViewStore();
  const { doc } = useDocStore();
  const activePage =
    doc?.pages.find((p) => p.id === doc.activePageId) ?? doc?.pages[0] ?? null;

  const [videoUrl, setVideoUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);

  const getCenterPos = () => {
    if (activePage) {
      return { x: activePage.width / 2, y: activePage.height / 2 };
    }
    const centerX = (-viewport.x + canvasSize.width / 2) / viewport.zoom;
    const centerY = (-viewport.y + canvasSize.height / 2) / viewport.zoom;
    return { x: centerX, y: centerY };
  };

  const handleVideoFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("video/")) {
        alert("Please select a video file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          const { x, y } = getCenterPos();
          insertVideo(x, y, result);
          setVideoUrl("");
        }
      };
      reader.readAsDataURL(file);
    },
    [doc, canvasSize.width, canvasSize.height, viewport.x, viewport.y, viewport.zoom],
  );

  const handleAddVideo = () => {
    const youtubeId = extractYouTubeId(videoUrl.trim());
    if (youtubeId) {
      const { x, y } = getCenterPos();
      insertVideo(x, y, youtubeId);
      setVideoUrl("");
    } else {
      alert("Please enter a valid YouTube URL");
    }
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
    <div className="flex-1 p-3 overflow-auto">
      <div className="text-sm font-semibold text-gray-800 mb-3">เพิ่มวิดีโอ</div>

      <label className="block text-sm font-medium text-gray-700 mb-2">YouTube URL:</label>
      <input
        type="text"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=..."
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="text-xs text-gray-400 mt-1 mb-3">Supports: youtube.com/watch?v=, youtu.be/</p>

      <div
        onDragOver={handleMediaDragOver}
        onDragLeave={handleMediaDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleVideoFile(file);
        }}
        onClick={() => videoInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-100"
        }`}
      >
        <div className="text-3xl mb-2">🎬</div>
        <p className="text-sm text-gray-600">
          {isDragging ? "Drop video here" : "Click or drag video file here"}
        </p>
        <p className="text-xs text-gray-400 mt-1">MP4, WebM, OGG</p>
      </div>

      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleVideoFile(file);
        }}
        className="hidden"
      />

      <button
        onClick={handleAddVideo}
        className="w-full mt-3 px-3 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
      >
        Add YouTube Video
      </button>
    </div>
  );
}
