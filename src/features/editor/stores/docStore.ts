/**
 * ===============================================
 * DOCUMENT STORE - จัดการ Document
 * ===============================================
 *
 * State หลักที่เก็บ document และ nodes ทั้งหมด
 *
 * Actions:
 * - loadDoc: โหลด document จาก localStorage
 * - addNode: เพิ่ม node ใหม่
 * - removeNodes: ลบ nodes
 * - updateNode: อัพเดท node เดียว
 * - updateNodes: อัพเดทหลาย nodes
 * - autoSave: บันทึกอัตโนมัติ (debounced)
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Document, Node } from "../core/doc/types";
import { createEmptyDocument, A4_LANDSCAPE_WIDTH, A4_LANDSCAPE_HEIGHT } from "../core/doc/migrate";
import { docsService } from "@/services/api/docs.service";
import { debounce } from "@/shared/utils/debounce";

interface DocState {
  doc: Document | null;
  isLoading: boolean;
  isSaving: boolean;

  loadDoc: (docId: string) => Promise<void>;
  setDoc: (doc: Document) => void;
  addNode: (node: Node) => void;
  removeNodes: (nodeIds: string[]) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  updateNodes: (updates: Array<{ id: string; changes: Partial<Node> }>) => void;
  saveDoc: () => void;
  autoSave: () => void;
}

// Debounced save function
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

    /**
     * โหลด document หรือสร้างใหม่ถ้าไม่มี
     */
    loadDoc: async (docId: string) => {
      set({ isLoading: true });

      let doc = docsService.getDoc(docId);
      if (!doc) {
        // สร้าง document ใหม่
        doc = createEmptyDocument(docId, "Untitled");
        docsService.saveDoc(doc);
      }

      // กันกระดาษหาย: เติม width/height/backgroundColor ถ้าไม่มี (ข้อมูลเก่าที่บันทึกไม่ครบ)
      const fullDoc: Document = {
        ...(doc as Document),
        width: (doc as Document).width || A4_LANDSCAPE_WIDTH,
        height: (doc as Document).height || A4_LANDSCAPE_HEIGHT,
        backgroundColor: (doc as Document).backgroundColor || "#ffffff",
      };

      set({ doc: fullDoc, isLoading: false });
    },

    setDoc: (doc: Document) => {
      set({ doc });
    },

    /**
     * เพิ่ม node ใหม่
     */
    addNode: (node: Node) => {
      set((state) => {
        if (!state.doc) return;
        state.doc.nodes.push(node);
        state.doc.updatedAt = Date.now();
      });
    },

    /**
     * ลบ nodes ตาม IDs
     */
    removeNodes: (nodeIds: string[]) => {
      set((state) => {
        if (!state.doc) return;
        const idsSet = new Set(nodeIds);
        state.doc.nodes = state.doc.nodes.filter((n) => !idsSet.has(n.id));
        state.doc.updatedAt = Date.now();
      });
    },

    /**
     * อัพเดท node เดียว
     */
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

    /**
     * อัพเดทหลาย nodes พร้อมกัน
     */
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

    /**
     * บันทึก document ลง localStorage
     */
    saveDoc: () => {
      const state = get();
      if (!state.doc) return;

      set({ isSaving: true });
      docsService.saveDoc({
        id: state.doc.id,
        title: state.doc.title,
        nodes: state.doc.nodes,
        version: state.doc.version,
        updatedAt: state.doc.updatedAt,
        width: state.doc.width,
        height: state.doc.height,
        backgroundColor: state.doc.backgroundColor,
      });
      set({ isSaving: false });
    },

    /**
     * บันทึกอัตโนมัติ (debounced 1 วินาที)
     */
    autoSave: () => {
      debouncedSave(get);
    },
  })),
);
