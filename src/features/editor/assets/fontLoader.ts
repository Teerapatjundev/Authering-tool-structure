// Font loader service

class FontLoader {
  private loadedFonts = new Set<string>();

  async loadFont(fontFamily: string): Promise<void> {
    if (this.loadedFonts.has(fontFamily)) {
      return;
    }

    // For MVP, assume system fonts or Google Fonts are already loaded
    // In production, use FontFace API or Web Font Loader
    this.loadedFonts.add(fontFamily);
  }

  isFontLoaded(fontFamily: string): boolean {
    return this.loadedFonts.has(fontFamily);
  }
}

export const fontLoader = new FontLoader();
