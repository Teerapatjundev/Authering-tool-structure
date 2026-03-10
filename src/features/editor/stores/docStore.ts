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
import { Document, Node, Page } from "../core/doc/types";
import { createEmptyDocument, A4_LANDSCAPE_WIDTH, A4_LANDSCAPE_HEIGHT } from "../core/doc/migrate";
import { docsService } from "@/services/api/docs.service";
import { debounce } from "@/shared/utils/debounce";
import { generateId, generateNodeId } from "@/shared/utils/id";

function deepClone<T>(value: T): T {
  const sc = (globalThis as any).structuredClone as undefined | ((v: any) => any);
  if (typeof sc === "function") {
    try {
      return sc(value);
    } catch {
      // Fall through to JSON clone
    }
  }

  const seen = new WeakSet<object>();
  const json = JSON.stringify(value as any, (_key, val) => {
    if (typeof val === "function") return undefined;

    if (val && typeof val === "object") {
      // Drop DOM / Window-like references that cannot be cloned or serialized.
      const anyVal = val as any;
      if (typeof anyVal.nodeType === "number") return undefined;
      if (anyVal.window && anyVal.window === val) return undefined;
      if (anyVal.self && anyVal.self === val) return undefined;

      if (seen.has(val)) return undefined;
      seen.add(val);
    }

    return val;
  });
  return JSON.parse(json) as T;
}

function remapIdsForPageNodes(sourceNodes: Node[]): Node[] {
  // Remap node ids, and also remap groupId / practice.id / masterId within the duplicated set.
  const nodeIdMap = new Map<string, string>();
  const groupIdMap = new Map<string, string>();
  const practiceIdMap = new Map<string, string>();

  for (const node of sourceNodes) {
    nodeIdMap.set(node.id, generateNodeId());
    if (node.groupId && !groupIdMap.has(node.groupId)) {
      groupIdMap.set(node.groupId, `group_${generateId()}`);
    }
    if (node.practice?.id && !practiceIdMap.has(node.practice.id)) {
      practiceIdMap.set(node.practice.id, `practice_${generateId()}`);
    }
  }

  return sourceNodes.map((n) => {
    const cloned = deepClone(n);
    cloned.id = nodeIdMap.get(n.id) ?? generateNodeId();

    if (cloned.groupId) {
      cloned.groupId = groupIdMap.get(cloned.groupId) ?? cloned.groupId;
    }

    if (cloned.masterId) {
      // If master is within the same page, remap to the duplicated master. Otherwise, keep reference.
      cloned.masterId = nodeIdMap.get(cloned.masterId) ?? cloned.masterId;
    }

    if (cloned.practice?.id) {
      const newPracticeId = practiceIdMap.get(cloned.practice.id);
      if (newPracticeId) {
        cloned.practice.id = newPracticeId;
      }
    }

    return cloned;
  });
}

interface DocState {
  doc: Document | null;
  isLoading: boolean;
  isSaving: boolean;

  loadDoc: (docId: string) => Promise<void>;
  setDoc: (doc: Document) => void;
  setActivePage: (pageId: string) => void;
  insertPageAt: (insertIndex: number) => void;
  duplicatePage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
  setPagesSnapshot: (pages: Page[], activePageId: string) => void;
  movePageToIndex: (pageId: string, toIndex: number) => void;
  addNode: (node: Node) => void;
  removeNodes: (nodeIds: string[]) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  updateNodes: (updates: Array<{ id: string; changes: Partial<Node> }>) => void;

  addNodeToPage: (pageId: string, node: Node) => void;
  removeNodesFromPage: (pageId: string, nodeIds: string[]) => void;
  updateNodeOnPage: (pageId: string, nodeId: string, updates: Partial<Node>) => void;
  updateNodesOnPage: (pageId: string, updates: Array<{ id: string; changes: Partial<Node> }>) => void;
  updateBackgroundColor: (color: string) => void;
  saveDoc: () => void;
  autoSave: () => void;
}

function ensureActivePage(doc: Document): Page {
  const active = doc.pages.find((p) => p.id === doc.activePageId);
  if (active) return active;
  const fallback = doc.pages[0];
  if (!fallback) {
    const pageId = `page_${doc.id}_1`;
    const newPage: Page = {
      id: pageId,
      title: "Page 1",
      nodes: [],
      width: A4_LANDSCAPE_WIDTH,
      height: A4_LANDSCAPE_HEIGHT,
      backgroundColor: "#ffffff",
    };
    doc.pages = [newPage];
    doc.activePageId = pageId;
    return newPage;
  }
  doc.activePageId = fallback.id;
  return fallback;
}

function findPage(doc: Document, pageId: string): Page | null {
  return doc.pages.find((p) => p.id === pageId) ?? null;
}

function migrateToPagedDocument(raw: any, docId: string): Document {
  // Already v2
  if (raw?.pages && Array.isArray(raw.pages) && raw.pages.length > 0) {
    const pages: Page[] = raw.pages.map((p: any, idx: number) => ({
      id: p.id || `page_${docId}_${idx + 1}`,
      title: p.title || `Page ${idx + 1}`,
      nodes: Array.isArray(p.nodes) ? p.nodes : [],
      width: p.width || raw.width || A4_LANDSCAPE_WIDTH,
      height: p.height || raw.height || A4_LANDSCAPE_HEIGHT,
      backgroundColor: p.backgroundColor || raw.backgroundColor || "#ffffff",
    }));

    const activePageId =
      typeof raw.activePageId === "string" && pages.some((p) => p.id === raw.activePageId)
        ? raw.activePageId
        : pages[0].id;

    return {
      id: raw.id || docId,
      title: raw.title || "Untitled",
      version: raw.version || 2,
      pages,
      activePageId,
      updatedAt: raw.updatedAt || Date.now(),
    };
  }

  // Legacy v1
  const pageId = `page_${docId}_1`;
  const width = raw?.width || A4_LANDSCAPE_WIDTH;
  const height = raw?.height || A4_LANDSCAPE_HEIGHT;
  const backgroundColor = raw?.backgroundColor || "#ffffff";
  const nodes = Array.isArray(raw?.nodes) ? raw.nodes : [];

  return {
    id: raw?.id || docId,
    title: raw?.title || "Untitled",
    version: raw?.version || 2,
    pages: [
      {
        id: pageId,
        title: "Page 1",
        nodes,
        width,
        height,
        backgroundColor,
      },
    ],
    activePageId: pageId,
    updatedAt: raw?.updatedAt || Date.now(),
  };
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

      const migrated = migrateToPagedDocument(doc as any, docId);
      // Ensure active page is valid
      ensureActivePage(migrated);

      // Requirement: when opening a document (e.g. from dashboard), always show the first page.
      // This overrides any previously-saved activePageId.
      if (migrated.pages.length > 0) {
        migrated.activePageId = migrated.pages[0].id;
      }

      set({ doc: migrated, isLoading: false });
    },

    setDoc: (doc: Document) => {
      set({ doc });
    },

    setActivePage: (pageId: string) => {
      set((state) => {
        if (!state.doc) return;
        if (!state.doc.pages.some((p) => p.id === pageId)) return;
        state.doc.activePageId = pageId;
      });
    },

    insertPageAt: (insertIndex: number) => {
      set((state) => {
        if (!state.doc) return;
        const doc = state.doc;
        const activePage = ensureActivePage(doc);

        const safeIndex = Math.max(0, Math.min(insertIndex, doc.pages.length));
        const newPageId = `page_${generateId()}`;
        const newPage: Page = {
          id: newPageId,
          title: `Page ${safeIndex + 1}`,
          nodes: [],
          width: activePage.width,
          height: activePage.height,
          backgroundColor: activePage.backgroundColor,
        };

        doc.pages.splice(safeIndex, 0, newPage);
        // รีเซ็ตชื่อหน้าให้เรียงตามลำดับแบบง่ายๆ
        doc.pages.forEach((p, idx) => {
          if (p.title?.startsWith("Page ")) p.title = `Page ${idx + 1}`;
        });
        doc.activePageId = newPageId;
        doc.updatedAt = Date.now();
      });
    },

    duplicatePage: (pageId: string) => {
      set((state) => {
        if (!state.doc) return;
        const doc = state.doc;

        const fromIndex = doc.pages.findIndex((p) => p.id === pageId);
        if (fromIndex < 0) return;

        const source = doc.pages[fromIndex];
        const newPageId = `page_${generateId()}`;
        const duplicated: Page = {
          id: newPageId,
          title: source.title,
          width: source.width,
          height: source.height,
          backgroundColor: source.backgroundColor,
          nodes: remapIdsForPageNodes(Array.isArray(source.nodes) ? source.nodes : []),
        };

        doc.pages.splice(fromIndex + 1, 0, duplicated);
        // รีเซ็ตชื่อหน้าให้เรียงตามลำดับแบบง่ายๆ (เฉพาะ title ที่ขึ้นต้นด้วย "Page ")
        doc.pages.forEach((p, idx) => {
          if (p.title?.startsWith("Page ")) p.title = `Page ${idx + 1}`;
        });
        doc.activePageId = newPageId;
        doc.updatedAt = Date.now();
      });
    },

    deletePage: (pageId: string) => {
      set((state) => {
        if (!state.doc) return;
        const doc = state.doc;
        if (doc.pages.length <= 1) return;

        const index = doc.pages.findIndex((p) => p.id === pageId);
        if (index < 0) return;

        const deletingActive = doc.activePageId === pageId;
        doc.pages.splice(index, 1);

        if (deletingActive) {
          const next = doc.pages[index] ?? doc.pages[index - 1] ?? doc.pages[0] ?? null;
          if (next) doc.activePageId = next.id;
        }

        // รีเซ็ตชื่อหน้าให้เรียงตามลำดับแบบง่ายๆ (เฉพาะ title ที่ขึ้นต้นด้วย "Page ")
        doc.pages.forEach((p, idx) => {
          if (p.title?.startsWith("Page ")) p.title = `Page ${idx + 1}`;
        });

        // Ensure active page remains valid
        ensureActivePage(doc);
        doc.updatedAt = Date.now();
      });
    },

    setPagesSnapshot: (pages: Page[], activePageId: string) => {
      set((state) => {
        if (!state.doc) return;
        state.doc.pages = pages;
        state.doc.activePageId = activePageId;
        ensureActivePage(state.doc);
        state.doc.updatedAt = Date.now();
      });
    },

    movePageToIndex: (pageId: string, toIndex: number) => {
      set((state) => {
        if (!state.doc) return;
        const doc = state.doc;

        const fromIndex = doc.pages.findIndex((p) => p.id === pageId);
        if (fromIndex < 0) return;

        const safeToIndex = Math.max(0, Math.min(toIndex, doc.pages.length));
        if (safeToIndex === fromIndex || safeToIndex === fromIndex + 1) return;

        const [moved] = doc.pages.splice(fromIndex, 1);
        const adjustedToIndex = fromIndex < safeToIndex ? safeToIndex - 1 : safeToIndex;
        doc.pages.splice(adjustedToIndex, 0, moved);

        // รีเซ็ตชื่อหน้าให้เรียงตามลำดับแบบง่ายๆ (เฉพาะ title ที่ขึ้นต้นด้วย "Page ")
        doc.pages.forEach((p, idx) => {
          if (p.title?.startsWith("Page ")) p.title = `Page ${idx + 1}`;
        });

        doc.updatedAt = Date.now();
      });
    },

    /**
     * เพิ่ม node ใหม่
     */
    addNode: (node: Node) => {
      set((state) => {
        if (!state.doc) return;
        const page = ensureActivePage(state.doc);
        page.nodes.push(node);
        state.doc.updatedAt = Date.now();
      });
    },

    addNodeToPage: (pageId: string, node: Node) => {
      set((state) => {
        if (!state.doc) return;
        const page = findPage(state.doc, pageId);
        if (!page) return;
        page.nodes.push(node);
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
        const page = ensureActivePage(state.doc);
        page.nodes = page.nodes.filter((n) => !idsSet.has(n.id));
        state.doc.updatedAt = Date.now();
      });
    },

    removeNodesFromPage: (pageId: string, nodeIds: string[]) => {
      set((state) => {
        if (!state.doc) return;
        const page = findPage(state.doc, pageId);
        if (!page) return;
        const idsSet = new Set(nodeIds);
        page.nodes = page.nodes.filter((n) => !idsSet.has(n.id));
        state.doc.updatedAt = Date.now();
      });
    },

    /**
     * อัพเดท node เดียว
     */
    updateNode: (nodeId: string, updates: Partial<Node>) => {
      set((state) => {
        if (!state.doc) return;
        const page = ensureActivePage(state.doc);
        const node = page.nodes.find((n) => n.id === nodeId);
        if (node) {
          Object.assign(node, updates);
          state.doc.updatedAt = Date.now();
        }
      });
    },

    updateNodeOnPage: (pageId: string, nodeId: string, updates: Partial<Node>) => {
      set((state) => {
        if (!state.doc) return;
        const page = findPage(state.doc, pageId);
        if (!page) return;
        const node = page.nodes.find((n) => n.id === nodeId);
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
        const page = ensureActivePage(state.doc);
        for (const { id, changes } of updates) {
          const node = page.nodes.find((n) => n.id === id);
          if (node) {
            Object.assign(node, changes);
          }
        }
        state.doc.updatedAt = Date.now();
      });
    },

    updateNodesOnPage: (pageId: string, updates: Array<{ id: string; changes: Partial<Node> }>) => {
      set((state) => {
        if (!state.doc) return;
        const page = findPage(state.doc, pageId);
        if (!page) return;
        for (const { id, changes } of updates) {
          const node = page.nodes.find((n) => n.id === id);
          if (node) {
            Object.assign(node, changes);
          }
        }
        state.doc.updatedAt = Date.now();
      });
    },

    /**
     * อัพเดทสีพื้นหลังกระดาษ
     */
    updateBackgroundColor: (color: string) => {
      set((state) => {
        if (!state.doc) return;
        const page = ensureActivePage(state.doc);
        page.backgroundColor = color;
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
        version: state.doc.version,
        updatedAt: state.doc.updatedAt,
        pages: state.doc.pages,
        activePageId: state.doc.activePageId,
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
