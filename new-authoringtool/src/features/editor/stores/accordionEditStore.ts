/**
 * ===============================================
 * ACCORDION EDIT STORE - จัดการการแก้ไข Accordion
 * ===============================================
 *
 * เก็บสถานะเมื่อกำลังแก้ไข accordion node:
 * - editingNodeId: ID ของ node ที่กำลังแก้ไข
 * - title: ชื่อหัวข้อของ accordion
 * - accordionItems: รายการ accordion ข้างใน
 *
 * Flow:
 * 1. Double-click accordion node → startEditing()
 * 2. แก้ไขใน overlay → updateTitle(), addAccordionItem(), etc.
 * 3. บันทึก/ยกเลิก → stopEditing()
 */

"use client";

import { create } from "zustand";

export interface AccordionItem {
  id: string;
  title: string;
}

interface AccordionEditState {
  editingNodeId: string | null;
  title: string;
  accordionItems: AccordionItem[];

  startEditing: (nodeId: string, title: string, items: AccordionItem[]) => void;
  updateTitle: (title: string) => void;
  addAccordionItem: (title: string) => void;
  removeAccordionItem: (id: string) => void;
  updateAccordionItem: (id: string, title: string) => void;
  stopEditing: () => void;
}

export const useAccordionEditStore = create<AccordionEditState>((set) => ({
  editingNodeId: null,
  title: "",
  accordionItems: [],

  /** เริ่มแก้ไข accordion node */
  startEditing: (nodeId: string, title: string, items: AccordionItem[]) => {
    set({ editingNodeId: nodeId, title, accordionItems: items });
  },

  /** อัพเดทชื่อหัวข้อ */
  updateTitle: (title: string) => {
    set({ title });
  },

  /** เพิ่มรายการ accordion */
  addAccordionItem: (title: string) => {
    set((state) => ({
      accordionItems: [
        ...state.accordionItems,
        { id: `accordion-${Date.now()}-${Math.random()}`, title },
      ],
    }));
  },

  /** ลบรายการ accordion */
  removeAccordionItem: (id: string) => {
    set((state) => ({
      accordionItems: state.accordionItems.filter((item) => item.id !== id),
    }));
  },

  /** อัพเดทรายการ accordion */
  updateAccordionItem: (id: string, title: string) => {
    set((state) => ({
      accordionItems: state.accordionItems.map((item) =>
        item.id === id ? { ...item, title } : item
      ),
    }));
  },

  /** หยุดแก้ไข */
  stopEditing: () => {
    set({ editingNodeId: null, title: "", accordionItems: [] });
  },
}));
