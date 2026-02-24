/**
 * ===============================================
 * SNAP GUIDES STORE - จัดการเส้น Snap
 * ===============================================
 *
 * เก็บสถานะเส้น guides (snap lines):
 * - guides: Array ของเส้นแนวนอน/แนวตั้ง พร้อมจุดเริ่ม-จบ
 *
 * เส้น guides จะแสดงเมื่อลาก node ไปใกล้ node อื่น
 * หรือตรงกลาง canvas
 */

"use client";

import { create } from "zustand";
import { SnapGuideInfo, EqualSpacingGuide } from "../core/geometry/snap";

export type { SnapGuideInfo as SnapGuide };

interface SnapGuidesState {
  guides: SnapGuideInfo[];
  spacingGuides: EqualSpacingGuide[];

  setGuides: (guides: SnapGuideInfo[]) => void;
  setSpacingGuides: (guides: EqualSpacingGuide[]) => void;
  clearGuides: () => void;
}

export const useSnapGuidesStore = create<SnapGuidesState>((set) => ({
  guides: [],
  spacingGuides: [],

  /** ตั้งค่าเส้น guides */
  setGuides: (guides: SnapGuideInfo[]) => {
    set({ guides });
  },

  /** ตั้งค่า spacing guides */
  setSpacingGuides: (spacingGuides: EqualSpacingGuide[]) => {
    set({ spacingGuides });
  },

  /** ลบเส้น guides ทั้งหมด */
  clearGuides: () => {
    set({ guides: [], spacingGuides: [] });
  },
}));
