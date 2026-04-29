/**
 * ===============================================
 * DRAG PREVIEW STORE - ตัวอย่างรูปทรงขณะลาก
 * ===============================================
 *
 * เก็บสถานะ drag preview เมื่อลาก element จาก sidebar มาวางบน canvas:
 * - elementType: ประเภท element ที่กำลังลาก (rect, ellipse, text)
 * - position: ตำแหน่งเมาส์บน canvas (world coordinates)
 * - active: กำลังลากอยู่หรือไม่
 *
 * ใช้แสดง ghost shape บน canvas ขณะลาก
 */

"use client";

import { create } from "zustand";

interface DragPreviewState {
  /** ประเภท element ที่กำลังลาก */
  elementType: string | null;
  /** ตำแหน่งใน world coordinates */
  worldX: number;
  worldY: number;
  /** กำลัง drag อยู่ใน canvas หรือไม่ */
  active: boolean;

  startDrag: (elementType: string) => void;
  updatePosition: (worldX: number, worldY: number) => void;
  endDrag: () => void;
}

export const useDragPreviewStore = create<DragPreviewState>((set) => ({
  elementType: null,
  worldX: 0,
  worldY: 0,
  active: false,

  startDrag: (elementType: string) => {
    set({ elementType, active: true });
  },

  updatePosition: (worldX: number, worldY: number) => {
    set({ worldX, worldY });
  },

  endDrag: () => {
    set({ elementType: null, worldX: 0, worldY: 0, active: false });
  },
}));
