// Asset management service
// For MVP, handles data URLs and external URLs
// In production, integrate with cloud storage

export interface Asset {
  id: string;
  type: "image" | "video" | "audio";
  url: string;
  name: string;
  size?: number;
  createdAt: number;
}

class AssetsService {
  private assets: Map<string, Asset> = new Map();

  async uploadImage(file: File): Promise<Asset> {
    // For MVP, convert to data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const asset: Asset = {
          id: `asset_${Date.now()}`,
          type: "image",
          url: reader.result as string,
          name: file.name,
          size: file.size,
          createdAt: Date.now(),
        };
        this.assets.set(asset.id, asset);
        resolve(asset);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  getAsset(id: string): Asset | undefined {
    return this.assets.get(id);
  }

  listAssets(): Asset[] {
    return Array.from(this.assets.values());
  }

  deleteAsset(id: string): void {
    this.assets.delete(id);
  }
}

export const assetsService = new AssetsService();
