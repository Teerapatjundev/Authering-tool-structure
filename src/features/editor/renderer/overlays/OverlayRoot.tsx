"use client";

// Overlays root component

import { TextEditOverlay } from "./TextEditOverlay";
import { VideoOverlay } from "./VideoOverlay";

export function OverlayRoot() {
  return (
    <>
      <TextEditOverlay />
      <VideoOverlay />
    </>
  );
}
