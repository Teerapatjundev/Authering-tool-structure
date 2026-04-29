/**
 * ===============================================
 * VIDEO PLAY STORE - จัดการการเล่นวิดีโอ
 * ===============================================
 *
 * เก็บสถานะเมื่อต้องการเล่น video:
 * - playingNodeId: ID ของ video node ที่กำลังเล่น
 * - videoSrc: แหล่งที่มาของวิดีโอ (YouTube ID หรือ file/data URL)
 */

"use client";

import { create } from "zustand";

interface VideoPlayState {
  playingNodeId: string | null;
  videoSrc: string | null;

  playVideo: (nodeId: string, videoSrc: string) => void;
  stopVideo: () => void;
}

export const useVideoPlayStore = create<VideoPlayState>((set) => ({
  playingNodeId: null,
  videoSrc: null,

  /** เริ่มเล่น video */
  playVideo: (nodeId: string, videoSrc: string) => {
    set({ playingNodeId: nodeId, videoSrc });
  },

  /** หยุดเล่น video */
  stopVideo: () => {
    set({ playingNodeId: null, videoSrc: null });
  },
}));
