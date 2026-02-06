import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";

// Enable MapSet plugin for Immer to support Set and Map
enableMapSet();

interface SelectionState {
  selectedIds: Set<string>;
  hoveredId: string | null;

  // Actions
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

    select: (id: string) => {
      set((state) => {
        state.selectedIds = new Set([id]);
      });
    },

    selectMultiple: (ids: string[]) => {
      set((state) => {
        state.selectedIds = new Set(ids);
      });
    },

    toggleSelect: (id: string) => {
      set((state) => {
        if (state.selectedIds.has(id)) {
          state.selectedIds.delete(id);
        } else {
          state.selectedIds.add(id);
        }
      });
    },

    clearSelection: () => {
      set((state) => {
        state.selectedIds.clear();
      });
    },

    setHovered: (id: string | null) => {
      set({ hoveredId: id });
    },

    isSelected: (id: string) => {
      return get().selectedIds.has(id);
    },

    getSelectedIds: () => {
      return Array.from(get().selectedIds);
    },
  })),
);
