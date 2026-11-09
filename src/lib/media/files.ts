import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { dataRoot } from "@/lib/auth/accounts";
import { MEDIA_PATH, mediaRefs } from "./refs";
import type { SiteDoc } from "@/lib/design";

export const MAX_UPLOAD = 8 * 1024 * 1024;
export class MediaError extends Error {
  constructor(public code: "format" | "size" | "quota") { super(code); }
}
const dir = (siteId: string) => {
  if (!/^[a-z0-9-]{1,80}$/.test(siteId)) throw new MediaError("format");
  return path.join(dataRoot(), "sites", siteId, "media");
};
const busy = new Set<string>();
export async function saveImage(siteId: string, bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_UPLOAD) throw new MediaError("size");
  // Один процесс, одна реплика: ограничиваем одновременное декодирование и запись квоты.
  if (busy.has(siteId) || busy.size >= 3) throw new MediaError("quota");
  busy.add(siteId);
  try {
    const folder = dir(siteId);
    await mkdir(folder, { recursive: true, mode: 0o700 });
    const files = (await readdir(folder)).filter(f => f.endsWith(".webp"));
    const total = (await Promise.all(files.map(async f => (await stat(path.join(folder, f))).size))).reduce((a, b) => a + b, 0);
    if (files.length >= 100 || total >= 80 * 1024 * 1024) throw new MediaError("quota");
    let output: Buffer;
    try {
      const image = sharp(bytes, { limitInputPixels: 20_000_000, animated: false, failOn: "warning" });
      const info = await image.metadata();
      if (!["jpeg", "png", "webp"].includes(info.format ?? "") || (info.pages ?? 1) > 1) throw new Error("Unsupported image");
      // Повторное кодирование: нормализует ориентацию и не переносит EXIF/GPS.
      output = await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch { throw new MediaError("format"); }
    if (output.length > 4 * 1024 * 1024 || total + output.length > 80 * 1024 * 1024) throw new MediaError("quota");
    const file = `${randomUUID()}.webp`;
    await writeFile(path.join(folder, file), output, { flag: "wx", mode: 0o600 });
    return `/media/${siteId}/${file}`;
  } finally { busy.delete(siteId); }
}
export async function readImage(src: string) {
  const match = MEDIA_PATH.exec(src);
  if (!match) throw new MediaError("format");
  return readFile(path.join(dir(match[1]), match[2]));
}
// Копия не зависит от файлов оригинала после его удаления.
export async function duplicateImages(doc: SiteDoc, from: string, to: string): Promise<SiteDoc> {
  let json = JSON.stringify(doc);
  for (const src of mediaRefs(doc)) {
    const match = MEDIA_PATH.exec(src)!;
    if (match[1] !== from) throw new Error("Foreign image reference");
    const bytes = await readImage(src);
    const folder = dir(to);
    await mkdir(folder, { recursive: true, mode: 0o700 });
    await writeFile(path.join(folder, match[2]), bytes, { flag: "wx", mode: 0o600 });
    json = json.split(src).join(`/media/${to}/${match[2]}`);
  }
  return JSON.parse(json) as SiteDoc;
}
