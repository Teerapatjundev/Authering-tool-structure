/**
 * ===============================================
 * TEXT LINK EDIT STORE - สถานะ Dialog แก้ไข TextLink
 * ===============================================
 */

import { create } from "zustand";

interface TextLinkEditState {
  editingNodeId: string | null;
  openDialog: (nodeId: string) => void;
  closeDialog: () => void;
}

export const useTextLinkEditStore = create<TextLinkEditState>((set) => ({
  editingNodeId: null,
  openDialog: (nodeId) => set({ editingNodeId: nodeId }),
  closeDialog: () => set({ editingNodeId: null }),
}));
