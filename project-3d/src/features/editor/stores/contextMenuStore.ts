/**
 * ===============================================
 * CONTEXT MENU STORE - จัดการ Context Menu
 * ===============================================
 *
 * เก็บสถานะ context menu (คลิกขวา / กดค้าง):
 * - isOpen: เปิด/ปิด
 * - x, y: ตำแหน่ง (screen coordinates)
 * - targetNodeId: node ที่คลิก (ถ้าคลิกที่ node)
 *
 * Actions:
 * - open: เปิด context menu ที่ตำแหน่งที่กำหนด
 * - close: ปิด context menu
 */

import { create } from "zustand";

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetNodeId: string | null;

  open: (x: number, y: number, targetNodeId?: string | null) => void;
  close: () => void;
}

export const useContextMenuStore = create<ContextMenuState>()((set) => ({
  isOpen: false,
  x: 0,
  y: 0,
  targetNodeId: null,

  /** เปิด context menu ที่ตำแหน่ง (x, y) */
  open: (x: number, y: number, targetNodeId?: string | null) => {
    set({
      isOpen: true,
      x,
      y,
      targetNodeId: targetNodeId ?? null,
    });
  },

  /** ปิด context menu */
  close: () => {
    set({ isOpen: false, targetNodeId: null });
  },
}));
