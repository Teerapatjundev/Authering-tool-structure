// Document persistence service using localStorage
// In production, replace with API calls to backend

const DOCS_INDEX_KEY = "canvas_editor_docs_index";
const DOC_PREFIX = "canvas_editor_doc_";

export interface DocMeta {
  id: string;
  title: string;
  updatedAt: number;
}

export interface DocData {
  id: string;
  title: string;
  nodes: any[];
  version: number;
  updatedAt: number;
}

class DocsService {
  private getIndexKey(): string {
    return DOCS_INDEX_KEY;
  }

  private getDocKey(docId: string): string {
    return `${DOC_PREFIX}${docId}`;
  }

  private getIndex(): Record<string, DocMeta> {
    if (typeof window === "undefined") return {};
    const stored = localStorage.getItem(this.getIndexKey());
    return stored ? JSON.parse(stored) : {};
  }

  private saveIndex(index: Record<string, DocMeta>): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.getIndexKey(), JSON.stringify(index));
  }

  listDocs(): DocMeta[] {
    const index = this.getIndex();
    return Object.values(index).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getDoc(docId: string): DocData | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(this.getDocKey(docId));
    if (!stored) return null;
    return JSON.parse(stored);
  }

  saveDoc(doc: DocData): void {
    if (typeof window === "undefined") return;

    // Save document
    localStorage.setItem(this.getDocKey(doc.id), JSON.stringify(doc));

    // Update index
    const index = this.getIndex();
    index[doc.id] = {
      id: doc.id,
      title: doc.title,
      updatedAt: doc.updatedAt,
    };
    this.saveIndex(index);
  }

  deleteDoc(docId: string): void {
    if (typeof window === "undefined") return;

    // Remove document
    localStorage.removeItem(this.getDocKey(docId));

    // Update index
    const index = this.getIndex();
    delete index[docId];
    this.saveIndex(index);
  }

  createDoc(docId: string, title = "Untitled"): DocData {
    const doc: DocData = {
      id: docId,
      title,
      nodes: [],
      version: 1,
      updatedAt: Date.now(),
    };
    this.saveDoc(doc);
    return doc;
  }
}

export const docsService = new DocsService();
