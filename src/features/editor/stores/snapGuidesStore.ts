"use client";

import { create } from "zustand";

export interface SnapGuide {
  type: "vertical" | "horizontal";
  position: number;
}

interface SnapGuidesState {
  guides: SnapGuide[];
  setGuides: (guides: SnapGuide[]) => void;
  clearGuides: () => void;
}

export const useSnapGuidesStore = create<SnapGuidesState>((set) => ({
  guides: [],
  setGuides: (guides: SnapGuide[]) => set({ guides }),
  clearGuides: () => set({ guides: [] }),
}));
