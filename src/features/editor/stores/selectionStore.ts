/**
 * ===============================================
 * SELECTION STORE - จัดการการเลือก Node
 * ===============================================
 *
 * เก็บสถานะการเลือก nodes:
 * - selectedIds: Set ของ node IDs ที่เลือกอยู่
 * - hoveredId: node ID ที่ hover อยู่
 *
 * Actions:
 * - select: เลือก node เดียว
 * - selectMultiple: เลือกหลาย nodes
 * - toggleSelect: สลับการเลือก
 * - clearSelection: ยกเลิกเลือกทั้งหมด
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";

// Enable MapSet plugin สำหรับ Set
enableMapSet();

interface SelectionState {
  selectedIds: Set<string>;
  hoveredId: string | null;

  select: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setHovered: (id: string | null) => void;
  isSelected: (id: string) => boolean;
  getSelectedIds: () => string[];
}

export const useSelectionStore = create<SelectionState>()(
  immer((set, get) => ({
    selectedIds: new Set<string>(),
    hoveredId: null,

    /** เลือก node เดียว (clear ที่เลือกอยู่ก่อน) */
    select: (id: string) => {
      set((state) => {
        state.selectedIds = new Set([id]);
      });
    },

    /** เลือกหลาย nodes พร้อมกัน */
    selectMultiple: (ids: string[]) => {
      set((state) => {
        state.selectedIds = new Set(ids);
      });
    },

    /** สลับการเลือก (toggle) - กด Shift+click */
    toggleSelect: (id: string) => {
      set((state) => {
        if (state.selectedIds.has(id)) {
          state.selectedIds.delete(id);
        } else {
          state.selectedIds.add(id);
        }
      });
    },

    /** ยกเลิกเลือกทั้งหมด */
    clearSelection: () => {
      set((state) => {
        state.selectedIds.clear();
      });
    },

    /** ตั้งค่า hovered node */
    setHovered: (id: string | null) => {
      set({ hoveredId: id });
    },

    /** ตรวจสอบว่า node ถูกเลือกอยู่หรือไม่ */
    isSelected: (id: string) => {
      return get().selectedIds.has(id);
    },

    /** ดึง IDs ที่เลือกอยู่เป็น Array */
    getSelectedIds: () => {
      return Array.from(get().selectedIds);
    },
  })),
);
