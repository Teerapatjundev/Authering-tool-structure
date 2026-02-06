import { create } from "zustand";
import { Asset } from "@/services/api/assets.service";

interface AssetsState {
  assets: Asset[];

  // Actions
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  getAsset: (id: string) => Asset | undefined;
}

export const useAssetsStore = create<AssetsState>((set, get) => ({
  assets: [],

  addAsset: (asset: Asset) => {
    set((state) => ({
      assets: [...state.assets, asset],
    }));
  },

  removeAsset: (id: string) => {
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
    }));
  },

  getAsset: (id: string) => {
    return get().assets.find((a) => a.id === id);
  },
}));
