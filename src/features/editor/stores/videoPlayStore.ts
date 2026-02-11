/**
 * ===============================================
 * VIDEO PLAY STORE - จัดการการเล่นวิดีโอ
 * ===============================================
 *
 * เก็บสถานะเมื่อต้องการเล่น video:
 * - playingNodeId: ID ของ video node ที่กำลังเล่น
 * - youtubeId: YouTube ID ของวิดีโอ
 */

"use client";

import { create } from "zustand";

interface VideoPlayState {
  playingNodeId: string | null;
  youtubeId: string | null;

  playVideo: (nodeId: string, youtubeId: string) => void;
  stopVideo: () => void;
}

export const useVideoPlayStore = create<VideoPlayState>((set) => ({
  playingNodeId: null,
  youtubeId: null,

  /** เริ่มเล่น video */
  playVideo: (nodeId: string, youtubeId: string) => {
    set({ playingNodeId: nodeId, youtubeId });
  },

  /** หยุดเล่น video */
  stopVideo: () => {
    set({ playingNodeId: null, youtubeId: null });
  },
}));
