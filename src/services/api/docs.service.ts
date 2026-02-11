/**
 * ===============================================
 * DOCS SERVICE - บริการจัดการ Document
 * ===============================================
 *
 * บริการสำหรับ CRUD operations ของ documents
 * ใช้ localStorage สำหรับ persistence
 *
 * หมายเหตุ: ในโปรดักชันควรเปลี่ยนเป็น API calls
 */

const STORAGE_KEY_PREFIX = "canvas_doc_";

export interface DocData {
  id: string;
  title: string;
  nodes: unknown[];
  version: number;
  updatedAt: number;
}

class DocsService {
  /**
   * ดึง document จาก localStorage
   * @param docId - รหัส document
   * @returns DocData หรือ null ถ้าไม่พบ
   */
  getDoc(docId: string): DocData | null {
    if (typeof window === "undefined") return null;

    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${docId}`);
    if (!stored) return null;

    return JSON.parse(stored);
  }

  /**
   * บันทึก document ลง localStorage
   * @param doc - Document ที่ต้องการบันทึก
   */
  saveDoc(doc: DocData): void {
    if (typeof window === "undefined") return;

    localStorage.setItem(`${STORAGE_KEY_PREFIX}${doc.id}`, JSON.stringify(doc));
  }

  /**
   * ลบ document
   * @param docId - รหัส document ที่ต้องการลบ
   */
  deleteDoc(docId: string): void {
    if (typeof window === "undefined") return;

    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${docId}`);
  }

  /**
   * ดึงรายการ documents ทั้งหมด
   */
  listDocs(): DocData[] {
    if (typeof window === "undefined") return [];

    const docs: DocData[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          docs.push(JSON.parse(stored));
        }
      }
    }

    return docs.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export const docsService = new DocsService();
