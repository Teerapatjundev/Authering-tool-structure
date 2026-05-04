/**
 * ===============================================
 * DEBOUNCE - หน่วงเวลาการเรียกฟังก์ชัน
 * ===============================================
 *
 * ใช้สำหรับป้องกันการเรียกฟังก์ชันถี่เกินไป
 * เช่น auto-save, search ขณะพิมพ์
 */

/**
 * สร้าง debounced version ของฟังก์ชัน
 * @param func - ฟังก์ชันที่ต้องการ debounce
 * @param wait - เวลารอ (ms) ก่อนเรียกจริง
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}
