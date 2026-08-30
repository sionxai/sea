const regionImages: Record<number, string> = {
  1: "/images/region-mungapdo.png",
  2: "/images/region-woljeongri.png",
  3: "/images/region-cheongsando.png",
};

export function resolveRegionImage(id: number): string {
  return regionImages[id] ?? "/images/hero-sea-forest.png";
}
