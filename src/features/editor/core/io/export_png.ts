// Export to PNG

import Konva from "konva";

export async function exportToPNG(
  stage: Konva.Stage,
  scale = 1,
): Promise<Blob> {
  const dataURL = stage.toDataURL({
    pixelRatio: scale,
  });

  const response = await fetch(dataURL);
  return response.blob();
}

export function downloadPNG(blob: Blob, filename = "canvas.png"): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
