/**
 * ===============================================
 * DOCS SERVICE - บริการจัดการ Document
 * ===============================================
 *
 * บริการสำหรับ CRUD operations ของ documents
 * ใช้ IndexedDB สำหรับ persistence
 *
 * หมายเหตุ: ในโปรดักชันควรเปลี่ยนเป็น API calls
 */

import { indexedDBService } from "./indexeddb";

const STORAGE_KEY_PREFIX = "canvas_doc_";

export interface DocData {
  id: string;
  title: string;
  version: number;
  updatedAt: number;

  // === v2 (multi-page) ===
  pages?: unknown[];
  activePageId?: string;

  // === v1 legacy (single-page) ===
  nodes?: unknown[];
  width?: number;
  height?: number;
  backgroundColor?: string;
}

class DocsService {
  /**
   * ดึง document จาก IndexedDB
   * @param docId - รหัส document
   * @returns DocData หรือ null ถ้าไม่พบ
   */
  async getDoc(docId: string): Promise<DocData | null> {
    if (typeof window === "undefined") return null;

    try {
      const doc = await indexedDBService.getItem<DocData>(
        `${STORAGE_KEY_PREFIX}${docId}`
      );
      return doc;
    } catch (error) {
      console.error("Error getting document:", error);
      return null;
    }
  }

  /**
   * บันทึก document ลง IndexedDB
   * @param doc - Document ที่ต้องการบันทึก
   */
  async saveDoc(doc: DocData): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      await indexedDBService.setItem(`${STORAGE_KEY_PREFIX}${doc.id}`, doc);
    } catch (error) {
      console.error("Error saving document:", error);
      throw error;
    }
  }

  /**
   * ลบ document
   * @param docId - รหัส document ที่ต้องการลบ
   */
  async deleteDoc(docId: string): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      await indexedDBService.removeItem(`${STORAGE_KEY_PREFIX}${docId}`);
    } catch (error) {
      console.error("Error deleting document:", error);
      throw error;
    }
  }

  /**
   * ดึงรายการ documents ทั้งหมด
   */
  async listDocs(): Promise<DocData[]> {
    if (typeof window === "undefined") return [];

    try {
      const docs = await indexedDBService.getItemsByPrefix<DocData>(
        STORAGE_KEY_PREFIX
      );
      return docs.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error("Error listing documents:", error);
      return [];
    }
  }
}

export const docsService = new DocsService();
