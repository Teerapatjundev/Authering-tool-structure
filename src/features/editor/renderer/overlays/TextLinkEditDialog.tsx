/**
 * ===============================================
 * TEXT LINK EDIT DIALOG - Dialog แก้ไข TextLink
 * ===============================================
 *
 * Dialog สำหรับแก้ไข Display Text และ URL ของ TextLink Node
 * เปิดเมื่อ double-click บน textlink element บน canvas
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useDocStore } from "../../stores/docStore";
import { useTextLinkEditStore } from "../../stores/textLinkEditStore";
import { editNode } from "../../core/commands/edit";
import { TextLinkNode } from "../../core/doc/types";

export function TextLinkEditDialog() {
  const { editingNodeId, closeDialog } = useTextLinkEditStore();
  const { doc } = useDocStore();

  const activePage =
    doc?.pages.find((p) => p.id === doc.activePageId) ?? doc?.pages[0] ?? null;

  const node = activePage?.nodes.find(
    (n) => n.id === editingNodeId && n.type === "textlink",
  ) as TextLinkNode | undefined;

  const [displayText, setDisplayText] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  const textInputRef = useRef<HTMLInputElement>(null);

  // sync state เมื่อ node เปลี่ยน
  useEffect(() => {
    if (node) {
      setDisplayText(node.text);
      setUrl(node.url);
      setUrlError("");
    }
  }, [editingNodeId, node]);

  // focus ที่ URL field เมื่อเปิด dialog
  useEffect(() => {
    if (editingNodeId) {
      setTimeout(() => textInputRef.current?.focus(), 50);
    }
  }, [editingNodeId]);

  if (!editingNodeId || !node) return null;

  const validateUrl = (value: string) => {
    if (!value.trim()) {
      setUrlError("กรุณาใส่ URL");
      return false;
    }
    if (!/^https?:\/\//i.test(value.trim())) {
      setUrlError("URL ต้องเริ่มต้นด้วย http:// หรือ https://");
      return false;
    }
    setUrlError("");
    return true;
  };

  const handleSave = () => {
    if (!validateUrl(url)) return;
    const trimmedText = displayText.trim() || url.trim();
    editNode(node.id, { text: trimmedText, url: url.trim() });
    closeDialog();
  };

  const handleCancel = () => {
    closeDialog();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div
      className="absolute inset-0 z-[200] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.35)", pointerEvents: "auto" }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[420px] p-6 flex flex-col gap-4"
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-lg">🔗</span>
          <h2 className="text-base font-semibold text-gray-800">แก้ไข TextLink</h2>
        </div>

        {/* Display Text */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            ข้อความที่แสดง
          </label>
          <input
            ref={textInputRef}
            type="text"
            value={displayText}
            onChange={(e) => setDisplayText(e.target.value)}
            placeholder="ข้อความที่แสดงบน canvas"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400">
            ถ้าเว้นว่างไว้จะแสดง URL แทน
          </p>
        </div>

        {/* URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (urlError) validateUrl(e.target.value);
            }}
            placeholder="https://example.com"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
              urlError
                ? "border-red-400 focus:ring-red-400"
                : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {urlError && <p className="text-xs text-red-500">{urlError}</p>}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
