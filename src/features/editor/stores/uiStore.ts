import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface UIState {
  showLeftPanel: boolean;
  showRightPanel: boolean;
  leftPanelTab: "elements" | "assets";
  rightPanelTab: "inspector" | "layers";

  // Modals
  exportModalOpen: boolean;
  confirmDeleteModalOpen: boolean;

  // Toast
  toasts: Array<{
    id: string;
    message: string;
    type: "info" | "success" | "error";
  }>;

  // Actions
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelTab: (tab: "elements" | "assets") => void;
  setRightPanelTab: (tab: "inspector" | "layers") => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  openConfirmDeleteModal: () => void;
  closeConfirmDeleteModal: () => void;
  addToast: (message: string, type?: "info" | "success" | "error") => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  immer((set, get) => ({
    showLeftPanel: true,
    showRightPanel: true,
    leftPanelTab: "elements",
    rightPanelTab: "inspector",
    exportModalOpen: false,
    confirmDeleteModalOpen: false,
    toasts: [],

    toggleLeftPanel: () => {
      set((state) => {
        state.showLeftPanel = !state.showLeftPanel;
      });
    },

    toggleRightPanel: () => {
      set((state) => {
        state.showRightPanel = !state.showRightPanel;
      });
    },

    setLeftPanelTab: (tab) => {
      set({ leftPanelTab: tab });
    },

    setRightPanelTab: (tab) => {
      set({ rightPanelTab: tab });
    },

    openExportModal: () => {
      set({ exportModalOpen: true });
    },

    closeExportModal: () => {
      set({ exportModalOpen: false });
    },

    openConfirmDeleteModal: () => {
      set({ confirmDeleteModalOpen: true });
    },

    closeConfirmDeleteModal: () => {
      set({ confirmDeleteModalOpen: false });
    },

    addToast: (
      message: string,
      type: "info" | "success" | "error" = "info",
    ) => {
      const id = `toast_${Date.now()}`;
      set((state) => {
        state.toasts.push({ id, message, type });
      });
      // Auto remove after 3 seconds
      setTimeout(() => {
        get().removeToast(id);
      }, 3000);
    },

    removeToast: (id: string) => {
      set((state) => {
        state.toasts = state.toasts.filter((t) => t.id !== id);
      });
    },
  })),
);
