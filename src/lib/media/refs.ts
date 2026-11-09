// Только локальные обработанные изображения, без внешних URL и data:.
export const MEDIA_PATH = /^\/media\/([a-z0-9-]{1,80})\/([a-f0-9-]{36}\.webp)$/;
export function mediaRefs(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const refs = Object.entries(value).flatMap(([key, v]) => key === "src" && typeof v === "string" && MEDIA_PATH.test(v) ? [v] : mediaRefs(v));
  return [...new Set(refs)];
}
