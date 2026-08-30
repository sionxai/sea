const seededProductImages: Record<number, string> = {
  1: "/images/kit-kelp-start.png",
  2: "/images/kit-gamtae-recovery.png",
  3: "/images/kit-observation.png",
};

export function resolveProductImage(id: number, image: string): string | null {
  if (image.startsWith("/")) return image;
  return seededProductImages[id] ?? null;
}
