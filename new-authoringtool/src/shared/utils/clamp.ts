/**
 * ===============================================
 * CLAMP UTILITIES - จำกัดค่าในช่วง
 * ===============================================
 */

/** จำกัดค่าให้อยู่ในช่วง min-max (guard NaN → คืน min) */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/** จำกัด zoom ให้อยู่ในช่วง 0.1-4 (guard NaN → คืน 1) */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return clamp(zoom, 0.1, 4);
}
