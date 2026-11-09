import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { dataRoot } from "@/lib/auth/account-store";
import { mediaRefs, MEDIA_PATH } from "@/lib/media/refs";
import type { Site, SiteStore } from "@/lib/storage/types";
import { BackupError, BackupSchema, MAX_BACKUP, MAX_DOCUMENTS, VersionSchema, type ProjectBackup } from "./format";

const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const runtime = globalThis as typeof globalThis & {windxBackupBusy?: boolean};
export async function withBackupSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (runtime.windxBackupBusy) throw new BackupError("busy");
  runtime.windxBackupBusy = true;
  try { return await fn(); } finally { runtime.windxBackupBusy = false; }
}
function checkRefs(b: ProjectBackup) {
  const files = new Set(b.images.map(i => i.name));
  if (files.size !== b.images.length || b.versionCount !== b.versions.length || b.versions.some((v, i) => v.n !== i + 1) || b.currentVersion > b.versions.length) throw new BackupError("format");
  for (const v of b.versions) {
    for (const src of mediaRefs(v.doc)) {
      const [, owner, file] = MEDIA_PATH.exec(src)!;
      if (owner !== b.sourceId || !files.has(file)) throw new BackupError("missing");
    }
  }
}
export async function exportBackup(store: SiteStore, site: Site): Promise<Buffer> {
  if (site.versionCount > 500) throw new BackupError("size");
  const versions = await store.listVersions(site.id);
  if (versions.length !== site.versionCount) throw new BackupError("missing");
  // Явный список полей исключает появившиеся позже секреты и привязки.
  const safeVersions = versions.map(v => VersionSchema.parse(v));
  if (Buffer.byteLength(JSON.stringify(safeVersions)) > MAX_DOCUMENTS) throw new BackupError("size");
  const dir = path.join(dataRoot(), "sites", site.id, "media");
  let names: string[];
  try { names = await readdir(dir); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; names = []; }
  const images: ProjectBackup["images"] = [];
  let total = 0;
  // Сохраняем и неиспользуемые сейчас загрузки: они могут быть нужны старой версии.
  for (const name of names) {
    if (!/^[a-f0-9-]{36}\.webp$/.test(name)) continue;
    const file = path.join(dir, name), info = await lstat(file);
    if (!info.isFile() || info.size > 4 * 1024 * 1024) throw new BackupError("format");
    total += Math.ceil(info.size / 3) * 4;
    if (images.length >= 100 || total + MAX_DOCUMENTS > MAX_BACKUP - 1024 * 1024) throw new BackupError("size");
    const bytes = await readFile(file);
    images.push({name, sha256: hash(bytes), base64: bytes.toString("base64")});
  }
  const b = BackupSchema.parse({format: "windx-project", schemaVersion: 1, exportedAt: new Date().toISOString(), sourceId: site.id,
    site: {name: site.name, brief: site.brief, facts: site.facts}, currentVersion: site.currentVersion, versionCount: site.versionCount, versions: safeVersions, images});
  checkRefs(b);
  const bytes = Buffer.from(JSON.stringify(b));
  if (bytes.length > MAX_BACKUP) throw new BackupError("size");
  return bytes;
}
export async function parseBackup(bytes: Buffer): Promise<ProjectBackup> {
  if (!bytes.length || bytes.length > MAX_BACKUP) throw new BackupError("size");
  let b: ProjectBackup;
  try {
    const raw = JSON.parse(bytes.toString("utf8"));
    // Проверяем размер документов до дорогой проверки всех схем.
    if (Buffer.byteLength(JSON.stringify(raw.versions ?? [])) > MAX_DOCUMENTS) throw new BackupError("size");
    b = BackupSchema.parse(raw);
  } catch (e) { throw e instanceof BackupError ? e : new BackupError("format"); }
  checkRefs(b);
  for (const image of b.images) {
    if (!image.base64 || image.base64.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.base64)) throw new BackupError("format");
    const bytes = Buffer.from(image.base64, "base64");
    if (bytes.length > 4 * 1024 * 1024 || hash(bytes) !== image.sha256 || bytes.toString("base64") !== image.base64) throw new BackupError("format");
    try {
      const decoder = sharp(bytes, {limitInputPixels: 20_000_000, animated: false, failOn: "warning"});
      const meta = await decoder.metadata();
      if (meta.format !== "webp" || (meta.pages ?? 1) > 1 || (meta.width ?? 0) > 2400 || (meta.height ?? 0) > 2400 || meta.exif || meta.xmp) throw new Error();
      await decoder.stats(); // Декодируем, не доверяем одному заголовку файла.
    } catch { throw new BackupError("format"); }
  }
  return b;
}
export async function restoreBackup(b: ProjectBackup, ownerId: string, requestId: string = randomUUID()): Promise<string> {
  // Вызывается только после parseBackup, новый случайный id не берётся из файла.
  const id = createHash("sha256").update(`${ownerId}:${requestId}`).digest("hex"), now = new Date().toISOString(), root = dataRoot();
  const receipt = {ownerId, requestId, hash: hash(Buffer.from(JSON.stringify(b)))};
  const destination = path.join(root, "sites", id);
  try {
    const previous = JSON.parse(await readFile(path.join(destination, "restore-receipt.json"), "utf8"));
    if (previous.ownerId !== ownerId || previous.hash !== receipt.hash) throw new BackupError("format");
    return id; // Ответ мог потеряться: повтор одного запроса не создаёт второй сайт.
  } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
  const stageRoot = path.join(root, "backup-staging");
  await mkdir(stageRoot, {recursive: true, mode: 0o700});
  const stage = path.join(stageRoot, randomUUID());
  await mkdir(stage, {mode: 0o700});
  try {
    await mkdir(path.join(stage, "versions"), {mode: 0o700});
    const site: Site = {id, ownerId, name: b.site.name, brief: b.site.brief, facts: b.site.facts, createdAt: now, updatedAt: now, currentVersion: b.currentVersion, versionCount: b.versions.length};
    await writeFile(path.join(stage, "site.json"), JSON.stringify(site), {flag: "wx", mode: 0o600});
    await writeFile(path.join(stage, "restore-receipt.json"), JSON.stringify(receipt), {flag: "wx", mode: 0o600});
    for (const v of b.versions) {
      const doc = JSON.parse(JSON.stringify(v.doc).split(`/media/${b.sourceId}/`).join(`/media/${id}/`));
      await writeFile(path.join(stage, "versions", `${v.n}.json`), JSON.stringify({...v, doc}), {flag: "wx", mode: 0o600});
    }
    if (b.images.length) await mkdir(path.join(stage, "media"), {mode: 0o700});
    for (const image of b.images) await writeFile(path.join(stage, "media", image.name), Buffer.from(image.base64, "base64"), {flag: "wx", mode: 0o600});
    await mkdir(path.join(root, "sites"), {recursive: true});
    // До атомарного переноса частичный проект не виден в кабинете или публичном списке.
    await rename(stage, destination);
    return id;
  } catch { await rm(stage, {recursive: true, force: true}); throw new BackupError("storage"); }
}
