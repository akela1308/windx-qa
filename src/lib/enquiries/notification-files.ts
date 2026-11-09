import { mkdir, readFile, writeFile, rename, stat, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { NotificationStatus } from "./types";
export const notificationDir = (dir: string) => path.join(dir, "notifications");
export async function readNotificationStatus(dir: string, id: string): Promise<NotificationStatus | null> {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error("Invalid enquiry id");
  try { return JSON.parse(await readFile(path.join(notificationDir(dir), `${id}.json`), "utf8")); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; throw e; }
}
export async function writeNotificationStatus(dir: string, id: string, value: NotificationStatus) {
  const file = path.join(notificationDir(dir), `${id}.json`), temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value), { flag: "wx", mode: 0o600 });
  try { await rename(temp, file); } finally { await rm(temp, { force: true }); }
}
export async function claimNotification(dir: string, id: string) {
  // Без recursive: удалённые сайты и ящики никогда не воссоздаются обработчиком.
  await mkdir(notificationDir(dir), { mode: 0o700 }).catch(e => { if (e.code !== "EEXIST") throw e; });
  const lock = path.join(notificationDir(dir), `${id}.lock`);
  try { await mkdir(lock, { mode: 0o700 }); }
  catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    const old = await stat(lock).catch(() => null);
    if (!old || Date.now() - old.mtimeMs < 120_000) return null;
    await rm(lock, { recursive: true, force: true });
    try { await mkdir(lock, { mode: 0o700 }); } catch { return null; }
  }
  return () => rm(lock, { recursive: true, force: true });
}
