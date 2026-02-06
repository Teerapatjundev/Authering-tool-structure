// Guide lines for alignment visualization

export interface Guide {
  type: "vertical" | "horizontal";
  position: number;
}

export function getActiveGuides(guidesX: number[], guidesY: number[]): Guide[] {
  const guides: Guide[] = [];

  for (const x of guidesX) {
    guides.push({ type: "vertical", position: x });
  }

  for (const y of guidesY) {
    guides.push({ type: "horizontal", position: y });
  }

  return guides;
}
