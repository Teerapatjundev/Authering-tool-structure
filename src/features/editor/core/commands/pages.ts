/**
 * ===============================================
 * PAGE COMMANDS - คำสั่งที่เกี่ยวกับการจัดการหน้า (Undo/Redo)
 * ===============================================
 *
 * รวมคำสั่งสำหรับ:
 * - insertPageAt: สร้างหน้าใหม่ที่ตำแหน่ง index
 * - duplicatePage: ทำซ้ำหน้า
 * - deletePage: ลบหน้า
 *
 * หมายเหตุ: คำสั่งเหล่านี้ commit เข้า history เพื่อให้ Undo/Redo ทำงาน
 */

import type { Node, Page } from "../doc/types";
import { useHistoryStore } from "../history/historyStore";
import type { PagesOp } from "../history/ops";
import { useDocStore } from "../../stores/docStore";
import { A4_LANDSCAPE_HEIGHT, A4_LANDSCAPE_WIDTH } from "../doc/migrate";
import { generateId, generateNodeId } from "@/shared/utils/id";

function safeClone<T>(value: T): T {
  const sc = (globalThis as any).structuredClone as undefined | ((v: any) => any);
  if (typeof sc === "function") {
    try {
      return sc(value);
    } catch {
      // fallback to JSON clone
    }
  }

  const seen = new WeakSet<object>();
  const json = JSON.stringify(value as any, (_key, val) => {
    if (typeof val === "function") return undefined;

    if (val && typeof val === "object") {
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

function renumberAutoPageTitles(pages: Page[]): void {
  pages.forEach((p, idx) => {
    if (p.title?.startsWith("Page ")) p.title = `Page ${idx + 1}`;
  });
}

function remapIdsForPageNodes(sourceNodes: Node[]): Node[] {
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
    const cloned = safeClone(n);
    cloned.id = nodeIdMap.get(n.id) ?? generateNodeId();

    if (cloned.groupId) {
      cloned.groupId = groupIdMap.get(cloned.groupId) ?? cloned.groupId;
    }

    if (cloned.masterId) {
      cloned.masterId = nodeIdMap.get(cloned.masterId) ?? cloned.masterId;
    }

    if (cloned.practice?.id) {
      const newPracticeId = practiceIdMap.get(cloned.practice.id);
      if (newPracticeId) cloned.practice.id = newPracticeId;
    }

    return cloned;
  });
}

function commitPagesChange(oldPages: Page[], oldActivePageId: string, newPages: Page[], newActivePageId: string) {
  const op: PagesOp = {
    type: "pages",
    timestamp: Date.now(),
    oldPages,
    newPages,
    oldActivePageId,
    newActivePageId,
  };

  useHistoryStore.getState().commit(op);
}

export function insertPageAt(insertIndex: number): void {
  const { doc } = useDocStore.getState();
  if (!doc) return;

  const oldPages = safeClone(doc.pages ?? []);
  const oldActive = doc.activePageId;

  const pages = safeClone(doc.pages ?? []);

  const safeIndex = Math.max(0, Math.min(insertIndex, pages.length));
  const activePage = pages.find((p) => p.id === doc.activePageId) ?? pages[0] ?? null;
  const baseWidth = activePage?.width ?? A4_LANDSCAPE_WIDTH;
  const baseHeight = activePage?.height ?? A4_LANDSCAPE_HEIGHT;
  const baseBg = activePage?.backgroundColor ?? "#ffffff";

  const newPageId = `page_${generateId()}`;
  const newPage: Page = {
    id: newPageId,
    title: `Page ${safeIndex + 1}`,
    nodes: [],
    width: baseWidth,
    height: baseHeight,
    backgroundColor: baseBg,
  };

  pages.splice(safeIndex, 0, newPage);
  renumberAutoPageTitles(pages);

  commitPagesChange(oldPages, oldActive, pages, newPageId);
}

export function duplicatePage(pageId: string): void {
  const { doc } = useDocStore.getState();
  if (!doc) return;

  const fromIndex = (doc.pages ?? []).findIndex((p) => p.id === pageId);
  if (fromIndex < 0) return;

  const oldPages = safeClone(doc.pages ?? []);
  const oldActive = doc.activePageId;

  const pages = safeClone(doc.pages ?? []);
  const source = pages[fromIndex];

  const newPageId = `page_${generateId()}`;
  const duplicated: Page = {
    id: newPageId,
    title: source.title,
    width: source.width,
    height: source.height,
    backgroundColor: source.backgroundColor,
    nodes: remapIdsForPageNodes(Array.isArray(source.nodes) ? source.nodes : []),
  };

  pages.splice(fromIndex + 1, 0, duplicated);
  renumberAutoPageTitles(pages);

  commitPagesChange(oldPages, oldActive, pages, newPageId);
}

export function deletePage(pageId: string): void {
  const { doc } = useDocStore.getState();
  if (!doc) return;

  if ((doc.pages ?? []).length <= 1) return;

  const index = (doc.pages ?? []).findIndex((p) => p.id === pageId);
  if (index < 0) return;

  const oldPages = safeClone(doc.pages ?? []);
  const oldActive = doc.activePageId;

  const pages = safeClone(doc.pages ?? []);
  const deletingActive = oldActive === pageId;

  pages.splice(index, 1);

  let newActive = oldActive;
  if (deletingActive) {
    const next = pages[index] ?? pages[index - 1] ?? pages[0] ?? null;
    newActive = next?.id ?? (pages[0]?.id ?? oldActive);
  }

  renumberAutoPageTitles(pages);

  commitPagesChange(oldPages, oldActive, pages, newActive);
}
