/**
 * ===============================================
 * CLAMP UTILITIES - จำกัดค่าในช่วง
 * ===============================================
 */

/** จำกัดค่าให้อยู่ในช่วง min-max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** จำกัด zoom ให้อยู่ในช่วง 0.1-4 */
export function clampZoom(zoom: number): number {
  return clamp(zoom, 0.1, 4);
}
