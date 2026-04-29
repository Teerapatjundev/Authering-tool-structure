/**
 * ===============================================
 * MARQUEE STORE - จัดการ Marquee Selection
 * ===============================================
 *
 * เก็บสถานะ marquee selection bounds สำหรับแสดง rectangle
 * ขณะที่ผู้ใช้ลากคลุมเลือก nodes
 */

import { create } from "zustand";

interface MarqueeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MarqueeState {
  bounds: MarqueeBounds | null;
  setBounds: (bounds: MarqueeBounds | null) => void;
  clear: () => void;
}

export const useMarqueeStore = create<MarqueeState>((set) => ({
  bounds: null,

  setBounds: (bounds) => set({ bounds }),

  clear: () => set({ bounds: null }),
}));
