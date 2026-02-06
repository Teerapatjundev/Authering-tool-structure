import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Document, Node } from "../core/doc/types";
import { createEmptyDocument } from "../core/doc/migrate";
import { docsService } from "@/services/api/docs.service";
import { debounce } from "@/shared/utils/debounce";

interface DocState {
  doc: Document | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  loadDoc: (docId: string) => Promise<void>;
  setDoc: (doc: Document) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  removeNodes: (nodeIds: string[]) => void;
  updateNodes: (updates: Array<{ id: string; changes: Partial<Node> }>) => void;
  setNodes: (nodes: Node[]) => void;
  setDocTitle: (title: string) => void;
  saveDoc: () => void;
  autoSave: () => void;
}

const debouncedSave = debounce((get: () => DocState) => {
  const state = get();
  if (state.doc) {
    state.saveDoc();
  }
}, 1000);

export const useDocStore = create<DocState>()(
  immer((set, get) => ({
    doc: null,
    isLoading: false,
    isSaving: false,
    error: null,

    loadDoc: async (docId: string) => {
      set({ isLoading: true, error: null });
      try {
        let doc = docsService.getDoc(docId);
        if (!doc) {
          // Create new document
          doc = createEmptyDocument(docId, "Untitled");
          docsService.saveDoc(doc);
        }
        set({ doc: doc as Document, isLoading: false });
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to load document",
          isLoading: false,
        });
      }
    },

    setDoc: (doc: Document) => {
      set({ doc });
    },

    updateNode: (nodeId: string, updates: Partial<Node>) => {
      set((state) => {
        if (!state.doc) return;
        const node = state.doc.nodes.find((n) => n.id === nodeId);
        if (node) {
          Object.assign(node, updates);
          state.doc.updatedAt = Date.now();
        }
      });
    },

    addNode: (node: Node) => {
      set((state) => {
        if (!state.doc) return;
        state.doc.nodes.push(node);
        state.doc.updatedAt = Date.now();
      });
    },

    removeNode: (nodeId: string) => {
      set((state) => {
        if (!state.doc) return;
        state.doc.nodes = state.doc.nodes.filter((n) => n.id !== nodeId);
        state.doc.updatedAt = Date.now();
      });
    },

    removeNodes: (nodeIds: string[]) => {
      set((state) => {
        if (!state.doc) return;
        const idsSet = new Set(nodeIds);
        state.doc.nodes = state.doc.nodes.filter((n) => !idsSet.has(n.id));
        state.doc.updatedAt = Date.now();
      });
    },

    updateNodes: (updates: Array<{ id: string; changes: Partial<Node> }>) => {
      set((state) => {
        if (!state.doc) return;
        for (const { id, changes } of updates) {
          const node = state.doc.nodes.find((n) => n.id === id);
          if (node) {
            Object.assign(node, changes);
          }
        }
        state.doc.updatedAt = Date.now();
      });
    },

    setNodes: (nodes: Node[]) => {
      set((state) => {
        if (!state.doc) return;
        state.doc.nodes = nodes;
        state.doc.updatedAt = Date.now();
      });
    },

    setDocTitle: (title: string) => {
      set((state) => {
        if (!state.doc) return;
        state.doc.title = title;
        state.doc.updatedAt = Date.now();
      });
      get().autoSave();
    },

    saveDoc: () => {
      const state = get();
      if (!state.doc) return;

      set({ isSaving: true });
      try {
        docsService.saveDoc({
          id: state.doc.id,
          title: state.doc.title,
          nodes: state.doc.nodes,
          version: state.doc.version,
          updatedAt: state.doc.updatedAt,
        });
        set({ isSaving: false });
      } catch (error) {
        console.error("Save failed:", error);
        set({ isSaving: false });
      }
    },

    autoSave: () => {
      debouncedSave(get);
    },
  })),
);
