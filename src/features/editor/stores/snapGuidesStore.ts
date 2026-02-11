/**
 * ===============================================
 * SNAP GUIDES STORE - จัดการเส้น Snap
 * ===============================================
 *
 * เก็บสถานะเส้น guides (snap lines):
 * - guides: Array ของเส้นแนวนอน/แนวตั้ง
 *
 * เส้น guides จะแสดงเมื่อลาก node ไปใกล้ node อื่น
 */

"use client";

import { create } from "zustand";

export interface SnapGuide {
  type: "vertical" | "horizontal"; // แนวตั้ง หรือ แนวนอน
  position: number; // ตำแหน่ง
}

interface SnapGuidesState {
  guides: SnapGuide[];

  setGuides: (guides: SnapGuide[]) => void;
  clearGuides: () => void;
}

export const useSnapGuidesStore = create<SnapGuidesState>((set) => ({
  guides: [],

  /** ตั้งค่าเส้น guides */
  setGuides: (guides: SnapGuide[]) => {
    set({ guides });
  },

  /** ลบเส้น guides ทั้งหมด */
  clearGuides: () => {
    set({ guides: [] });
  },
}));
