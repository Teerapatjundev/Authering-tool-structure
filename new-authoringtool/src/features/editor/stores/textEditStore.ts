/**
 * ===============================================
 * TEXT EDIT STORE - จัดการการแก้ไขข้อความ
 * ===============================================
 *
 * เก็บสถานะเมื่อกำลังแก้ไข text node:
 * - editingNodeId: ID ของ node ที่กำลังแก้ไข
 * - editingText: ข้อความที่กำลังแก้ไข
 *
 * Flow:
 * 1. Double-click text node → startEditing()
 * 2. แก้ไขใน overlay → updateText()
 * 3. บันทึก/ยกเลิก → stopEditing()
 */

"use client";

import { create } from "zustand";

interface TextEditState {
  editingNodeId: string | null;
  editingText: string;

  startEditing: (nodeId: string, text: string) => void;
  updateText: (text: string) => void;
  stopEditing: () => void;
}

export const useTextEditStore = create<TextEditState>((set) => ({
  editingNodeId: null,
  editingText: "",

  /** เริ่มแก้ไข text node */
  startEditing: (nodeId: string, text: string) => {
    set({ editingNodeId: nodeId, editingText: text });
  },

  /** อัพเดทข้อความ */
  updateText: (text: string) => {
    set({ editingText: text });
  },

  /** หยุดแก้ไข */
  stopEditing: () => {
    set({ editingNodeId: null, editingText: "" });
  },
}));
