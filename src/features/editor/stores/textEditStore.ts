"use client";

import { create } from "zustand";

interface TextEditState {
  editingNodeId: string | null;
  editingText: string;
  startEditing: (nodeId: string, text: string) => void;
  updateText: (text: string) => void;
  stopEditing: () => void;
}

export const useTextEditStore = create<TextEditState>((set) => ({
  editingNodeId: null,
  editingText: "",
  startEditing: (nodeId: string, text: string) =>
    set({ editingNodeId: nodeId, editingText: text }),
  updateText: (text: string) => set({ editingText: text }),
  stopEditing: () => set({ editingNodeId: null, editingText: "" }),
}));
