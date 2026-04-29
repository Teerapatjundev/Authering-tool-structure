/**
 * ===============================================
 * ACCORDION EDIT OVERLAY - Dialog แก้ไข Accordion
 * ===============================================
 *
 * Dialog สำหรับแก้ไข Accordion Node:
 * - แก้ไขชื่อหัวข้อ
 * - เพิ่ม/ลบ/แก้ไข Accordion Items
 *
 * เปิดเมื่อ double-click บน Accordion element บน canvas
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useDocStore } from "../../stores/docStore";
import { useAccordionEditStore } from "../../stores/accordionEditStore";
import { editNode } from "../../core/commands/edit";
import { AccordionNode } from "../../core/doc/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccordionEditOverlay() {
  const { editingNodeId, title, accordionItems, updateTitle, addAccordionItem, removeAccordionItem, updateAccordionItem, stopEditing } = useAccordionEditStore();
  const { doc } = useDocStore();

  const activePage =
    doc?.pages.find((p) => p.id === doc.activePageId) ?? doc?.pages[0] ?? null;

  const node = activePage?.nodes.find(
    (n) => n.id === editingNodeId && n.type === "accordion",
  ) as AccordionNode | undefined;

  const [newItemTitle, setNewItemTitle] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState("");

  const titleInputRef = useRef<HTMLInputElement>(null);

  // focus ที่ title field เมื่อเปิด dialog
  useEffect(() => {
    if (editingNodeId) {
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [editingNodeId]);

  if (!editingNodeId || !node) return null;

  const handleSave = () => {
    const trimmedTitle = title.trim() || "Accordion";
    editNode(node.id, {
      title: trimmedTitle,
      accordionItems: accordionItems,
    });
    stopEditing();
  };

  const handleCancel = () => {
    stopEditing();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && e.target === titleInputRef.current) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleAddItem = () => {
    const trimmed = newItemTitle.trim();
    if (!trimmed) return;
    addAccordionItem(trimmed);
    setNewItemTitle("");
  };

  const handleRemoveItem = (id: string) => {
    removeAccordionItem(id);
    if (editingItemId === id) {
      setEditingItemId(null);
      setEditingItemTitle("");
    }
  };

  const handleStartEditItem = (id: string, currentTitle: string) => {
    setEditingItemId(id);
    setEditingItemTitle(currentTitle);
  };

  const handleSaveEditItem = () => {
    if (!editingItemId) return;
    const trimmed = editingItemTitle.trim();
    if (!trimmed) {
      handleRemoveItem(editingItemId);
      return;
    }
    updateAccordionItem(editingItemId, trimmed);
    setEditingItemId(null);
    setEditingItemTitle("");
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setEditingItemTitle("");
  };

  return (
    <div
      className="absolute inset-0 z-[200] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.35)", pointerEvents: "auto" }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[600px] p-6 flex flex-col gap-4 overflow-y-auto"
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">แก้ไข Accordion</h2>
        </div>

        {/* Title Input */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="accordion-title" className="text-sm font-medium text-gray-700">
            ชื่อหัวข้อ <span className="text-red-500">*</span>
          </Label>
          <Input
            id="accordion-title"
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="ชื่อหัวข้อ Accordion"
            className="w-full"
          />
        </div>

        {/* Accordion Items */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-gray-700">
            รายการ Accordion ({accordionItems.length})
          </Label>

          {/* List of existing items */}
          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg p-2">
            {accordionItems.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีรายการ</p>
            )}
            {accordionItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
              >
                {editingItemId === item.id ? (
                  <>
                    <Input
                      type="text"
                      value={editingItemTitle}
                      onChange={(e) => setEditingItemTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveEditItem();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          handleCancelEditItem();
                        }
                      }}
                      className="flex-1 h-8 text-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveEditItem}
                      className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditItem}
                      className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-800">{item.title}</span>
                    <button
                      type="button"
                      onClick={() => handleStartEditItem(item.id, item.title)}
                      className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      ลบ
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new item */}
          <div className="flex gap-2">
            <Input
              type="text"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
              placeholder="เพิ่มรายการใหม่..."
              className="flex-1"
            />
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!newItemTitle.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              เพิ่ม
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
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
