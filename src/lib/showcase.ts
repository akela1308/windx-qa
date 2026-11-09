// Порядок публичных направлений. Снимок и полный просмотр используют один документ каталога.
export const SHOWCASE = ["clear-product", "studio-grid", "signal", "night-shift", "soft-clay", "newsprint", "poster-duo", "deep-ink", "swiss", "monotone", "warm-editorial"] as const;
export type StyleId = (typeof SHOWCASE)[number];

export function isStyle(x: unknown): x is StyleId {
  return typeof x === "string" && (SHOWCASE as readonly string[]).includes(x);
}

export const CATALOGUE_ASSET_VERSION = "20261104-1";
export const shot = (id: StyleId) => `/showcase/${id}.jpg?v=${CATALOGUE_ASSET_VERSION}`;
export const templateShot = (i: number) => `/showcase/template-${i}.jpg?v=${CATALOGUE_ASSET_VERSION}`;
