/**
 * ===============================================
 * OVERLAY ROOT - รวม Overlays ทั้งหมด
 * ===============================================
 *
 * Container สำหรับ overlays ที่แสดงทับ canvas:
 * - TextEditOverlay: modal แก้ไขข้อความ
 * - VideoOverlay: video elements
 * - AccordionEditOverlay: modal แก้ไข Accordion
 */

"use client";

import { TextEditOverlay } from "./TextEditOverlay";
import { VideoOverlay } from "./VideoOverlay";
import { TextLinkEditDialog } from "./TextLinkEditDialog";
import { AccordionEditOverlay } from "./AccordionEditOverlay";

export function OverlayRoot() {
  return (
    <>
      <VideoOverlay />
      <TextEditOverlay />
      <TextLinkEditDialog />
      <AccordionEditOverlay />
    </>
  );
}
