/**
 * ===============================================
 * INDEXEDDB UTILITY - จัดการ IndexedDB
 * ===============================================
 *
 * Wrapper สำหรับ IndexedDB operations
 * ใช้แทน localStorage เพื่อรองรับข้อมูลขนาดใหญ่
 */

const DB_NAME = "CanvasEditorDB";
const DB_VERSION = 2;
const STORE_NAME = "documents";

interface IDBDocument {
  id: string;
  data: unknown;
  updatedAt: number;
}

class IndexedDBService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * เปิดการเชื่อมต่อกับ IndexedDB
   */
  private async openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // สร้าง object store ถ้ายังไม่มี
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
          });
          // สร้าง index สำหรับ updatedAt เพื่อการ sorting
          objectStore.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * บันทึกข้อมูล
   * @param key - รหัสของข้อมูล
   * @param value - ข้อมูลที่ต้องการบันทึก
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const document: IDBDocument = {
      id: key,
      data: value,
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(document);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * ดึงข้อมูล
   * @param key - รหัสของข้อมูล
   */
  async getItem<T>(key: string): Promise<T | null> {
    const db = await this.openDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as IDBDocument | undefined;
        resolve(result ? (result.data as T) : null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * ลบข้อมูล
   * @param key - รหัสของข้อมูล
   */
  async removeItem(key: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * ดึงข้อมูลทั้งหมด
   */
  async getAllItems<T>(): Promise<T[]> {
    const db = await this.openDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as IDBDocument[];
        resolve(results.map((doc) => doc.data as T));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * ดึงข้อมูลทั้งหมดที่มี key ขึ้นต้นด้วยคำที่ระบุ
   * @param prefix - คำนำหน้าของ key
   */
  async getItemsByPrefix<T>(prefix: string): Promise<T[]> {
    const db = await this.openDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => { 
        const results = request.result as IDBDocument[];
        const filtered = results
          .filter((doc) => doc.id.startsWith(prefix))
          .map((doc) => doc.data as T);
        resolve(filtered);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * ลบข้อมูลทั้งหมด
   */
  async clear(): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

export const indexedDBService = new IndexedDBService();
