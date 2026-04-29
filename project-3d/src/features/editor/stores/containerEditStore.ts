/**
 * ===============================================
 * CONTAINER EDIT STORE
 * ===============================================
 *
 * Tracks which container (primary parent node) is currently in "edit children" mode.
 * Used for Choice parent/child interactions.
 */

import { create } from "zustand";

interface ContainerEditState {
  activeContainerId: string | null;
  setActiveContainer: (id: string | null) => void;
  toggleContainer: (id: string) => void;
  isEditing: (id: string) => boolean;
}

export const useContainerEditStore = create<ContainerEditState>((set, get) => ({
  activeContainerId: null,

  setActiveContainer: (id) => set({ activeContainerId: id }),

  toggleContainer: (id) => {
    const current = get().activeContainerId;
    set({ activeContainerId: current === id ? null : id });
  },

  isEditing: (id) => get().activeContainerId === id,
}));
