// Image caching service

class ImageCache {
  private cache = new Map<string, HTMLImageElement>();
  private loading = new Map<string, Promise<HTMLImageElement>>();

  preload(src: string): Promise<HTMLImageElement> {
    if (this.cache.has(src)) {
      return Promise.resolve(this.cache.get(src)!);
    }

    if (this.loading.has(src)) {
      return this.loading.get(src)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        this.cache.set(src, img);
        this.loading.delete(src);
        resolve(img);
      };
      img.onerror = (err) => {
        this.loading.delete(src);
        reject(err);
      };
      img.src = src;
    });

    this.loading.set(src, promise);
    return promise;
  }

  getImage(src: string): HTMLImageElement | null {
    return this.cache.get(src) || null;
  }

  clear(): void {
    this.cache.clear();
    this.loading.clear();
  }
}

export const imageCache = new ImageCache();
