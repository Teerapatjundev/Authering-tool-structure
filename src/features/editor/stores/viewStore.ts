import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Viewport } from "../core/doc/types";
import { clampZoom } from "@/shared/utils/clamp";

interface ViewState {
  viewport: Viewport;
  canvasSize: { width: number; height: number };
  isPanning: boolean;

  // Actions
  setViewport: (viewport: Partial<Viewport>) => void;
  setZoom: (zoom: number, centerX?: number, centerY?: number) => void;
  pan: (dx: number, dy: number) => void;
  resetView: () => void;
  setCanvasSize: (width: number, height: number) => void;
  setIsPanning: (isPanning: boolean) => void;
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
}

export const useViewStore = create<ViewState>()(
  immer((set, get) => ({
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
    },
    canvasSize: { width: 1920, height: 1080 },
    isPanning: false,

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

    setZoom: (zoom: number, centerX?: number, centerY?: number) => {
      const state = get();
      const oldZoom = state.viewport.zoom;
      const newZoom = clampZoom(zoom);

      if (centerX !== undefined && centerY !== undefined) {
        // Zoom towards a specific point
        const worldPos = state.screenToWorld(centerX, centerY);

        set((state) => {
          state.viewport.zoom = newZoom;
          // Adjust position to keep worldPos at the same screen position
          const newScreenPos = state.worldToScreen(worldPos.x, worldPos.y);
          state.viewport.x += centerX - newScreenPos.x;
          state.viewport.y += centerY - newScreenPos.y;
        });
      } else {
        set((state) => {
          state.viewport.zoom = newZoom;
        });
      }
    },

    pan: (dx: number, dy: number) => {
      set((state) => {
        state.viewport.x += dx;
        state.viewport.y += dy;
      });
    },

    resetView: () => {
      set((state) => {
        state.viewport = { x: 0, y: 0, zoom: 1 };
      });
    },

    setCanvasSize: (width: number, height: number) => {
      set({ canvasSize: { width, height } });
    },

    setIsPanning: (isPanning: boolean) => {
      set({ isPanning });
    },

    screenToWorld: (screenX: number, screenY: number) => {
      const { viewport } = get();
      return {
        x: (screenX - viewport.x) / viewport.zoom,
        y: (screenY - viewport.y) / viewport.zoom,
      };
    },

    worldToScreen: (worldX: number, worldY: number) => {
      const { viewport } = get();
      return {
        x: worldX * viewport.zoom + viewport.x,
        y: worldY * viewport.zoom + viewport.y,
      };
    },
  })),
);
