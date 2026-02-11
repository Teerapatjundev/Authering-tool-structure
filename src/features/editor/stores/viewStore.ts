/**
 * ===============================================
 * VIEW STORE - จัดการ Viewport (Pan & Zoom)
 * ===============================================
 *
 * เก็บสถานะ viewport และ canvas size:
 * - viewport: { x, y, zoom } - ตำแหน่งและระดับ zoom
 * - canvasSize: ขนาด canvas
 *
 * Actions:
 * - setZoom: ตั้งค่า zoom
 * - pan: เลื่อน viewport
 * - centerDocument: จัด document ให้อยู่กลาง viewport
 * - screenToWorld: แปลงพิกัดหน้าจอเป็นพิกัด world
 * - worldToScreen: แปลงพิกัด world เป็นพิกัดหน้าจอ
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Viewport } from "../core/doc/types";
import { clampZoom } from "@/shared/utils/clamp";

interface ViewState {
  viewport: Viewport;
  canvasSize: { width: number; height: number };
  isPanning: boolean;

  setViewport: (viewport: Partial<Viewport>) => void;
  setZoom: (zoom: number, centerX?: number, centerY?: number) => void;
  pan: (dx: number, dy: number) => void;
  resetView: () => void;
  setCanvasSize: (width: number, height: number) => void;
  setIsPanning: (isPanning: boolean) => void;
  centerDocument: (
    docWidth: number,
    docHeight: number,
    viewWidth: number,
    viewHeight: number,
  ) => void;
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
}

export const useViewStore = create<ViewState>()(
  immer((set, get) => ({
    viewport: { x: 0, y: 0, zoom: 1 },
    canvasSize: { width: 1920, height: 1080 },
    isPanning: false,

    /** ตั้งค่า viewport */
    setViewport: (updates: Partial<Viewport>) => {
      set((state) => {
        if (updates.zoom !== undefined) {
          state.viewport.zoom = clampZoom(updates.zoom);
        }
        if (updates.x !== undefined) {
          state.viewport.x = updates.x;
        }
        if (updates.y !== undefined) {
          state.viewport.y = updates.y;
        }
      });
    },

    /**
     * ตั้งค่า zoom
     * @param zoom - ระดับ zoom ใหม่
     * @param centerX - จุด center X (สำหรับ zoom ไปที่จุดนั้น)
     * @param centerY - จุด center Y
     */
    setZoom: (zoom: number, centerX?: number, centerY?: number) => {
      const state = get();
      const newZoom = clampZoom(zoom);

      if (centerX !== undefined && centerY !== undefined) {
        // Zoom ไปที่จุด center
        const worldPos = state.screenToWorld(centerX, centerY);

        set((state) => {
          state.viewport.zoom = newZoom;
          // คำนวณ offset ใหม่เพื่อให้จุดเดิมอยู่ที่เดิม
          state.viewport.x = centerX - worldPos.x * newZoom;
          state.viewport.y = centerY - worldPos.y * newZoom;
        });
      } else {
        set((state) => {
          state.viewport.zoom = newZoom;
        });
      }
    },

    /** Pan (เลื่อน) viewport */
    pan: (dx: number, dy: number) => {
      set((state) => {
        state.viewport.x += dx;
        state.viewport.y += dy;
      });
    },

    /** Reset view กลับ default */
    resetView: () => {
      set((state) => {
        state.viewport = { x: 0, y: 0, zoom: 1 };
      });
    },

    /**
     * จัด document ให้อยู่กลาง viewport พร้อม zoom ให้พอดี
     * @param docWidth - ความกว้าง document
     * @param docHeight - ความสูง document
     * @param viewWidth - ความกว้าง viewport (container)
     * @param viewHeight - ความสูง viewport (container)
     */
    centerDocument: (
      docWidth: number,
      docHeight: number,
      viewWidth: number,
      viewHeight: number,
    ) => {
      // คำนวณ zoom ที่ทำให้ document พอดีกับ viewport (มี margin 40px รอบๆ)
      const margin = 60;
      const availableWidth = viewWidth - margin * 2;
      const availableHeight = viewHeight - margin * 2;

      const scaleX = availableWidth / docWidth;
      const scaleY = availableHeight / docHeight;
      const zoom = clampZoom(Math.min(scaleX, scaleY, 1)); // ไม่ zoom เกิน 1

      // คำนวณ offset ให้ document อยู่กลาง
      const scaledWidth = docWidth * zoom;
      const scaledHeight = docHeight * zoom;
      const x = (viewWidth - scaledWidth) / 2;
      const y = (viewHeight - scaledHeight) / 2;

      set((state) => {
        state.viewport = { x, y, zoom };
      });
    },

    setCanvasSize: (width: number, height: number) => {
      set({ canvasSize: { width, height } });
    },

    setIsPanning: (isPanning: boolean) => {
      set({ isPanning });
    },

    /**
     * แปลงพิกัดหน้าจอเป็นพิกัด world (canvas)
     * ใช้เมื่อต้องการหาตำแหน่งคลิกบน canvas
     */
    screenToWorld: (screenX: number, screenY: number) => {
      const { viewport } = get();
      return {
        x: (screenX - viewport.x) / viewport.zoom,
        y: (screenY - viewport.y) / viewport.zoom,
      };
    },

    /**
     * แปลงพิกัด world เป็นพิกัดหน้าจอ
     * ใช้เมื่อต้องการวาง HTML element ทับ canvas
     */
    worldToScreen: (worldX: number, worldY: number) => {
      const { viewport } = get();
      return {
        x: worldX * viewport.zoom + viewport.x,
        y: worldY * viewport.zoom + viewport.y,
      };
    },
  })),
);
