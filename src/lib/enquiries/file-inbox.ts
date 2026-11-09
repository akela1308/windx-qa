import { readdir, readFile, writeFile, link, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { EnquiryError, type Enquiry } from "./types";
import { readNotificationStatus } from "./notification-files";
import { notificationDir } from "./notification-files";

const validId = (id: string) => /^[a-f0-9]{64}$/.test(id);
export async function addFileEnquiry(dir: string, enquiry: Enquiry) {
  if (!validId(enquiry.id)) throw new Error("Invalid enquiry id");
  const file = path.join(dir, `${enquiry.id}.json`);
  try { await readFile(file); return false; } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
  // Папку создаёт публикация, не входящий запрос: не воссоздаём удалённый сайт.
  const names = await readdir(dir);
  if (names.filter((name) => /^[a-f0-9]{64}\.json$/.test(name)).length >= 1000) throw new EnquiryError(503, "This inbox is currently full. Please use another contact method on the site.");
  const temp = path.join(dir, `${enquiry.id}.${randomUUID()}.tmp`);
  await writeFile(temp, JSON.stringify(enquiry), { flag: "wx", mode: 0o600 });
  try { await link(temp, file); return true; }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "EEXIST") return false; throw e; }
  finally { await unlink(temp).catch(() => {}); }
}
export async function listFileEnquiries(dir: string, limit = 50, offset = 0) {
  let names: string[];
  try { names = await readdir(dir); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; }
  const values = await Promise.all(names.filter((name) => /^[a-f0-9]{64}\.json$/.test(name)).map(async (name) => JSON.parse(await readFile(path.join(dir, name), "utf8")) as Enquiry));
  const start = Number.isInteger(offset) ? Math.min(Math.max(offset, 0), 1000) : 0;
  const selected = values.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(start, start + Math.min(Math.max(limit, 1), 100));
  return Promise.all(selected.map(async (record) => ({ id: record.id, createdAt: record.createdAt, name: record.name, contact: record.contact, message: record.message, version: record.version, section: record.section, notification: await readNotificationStatus(dir, record.id) ?? record.notification })));
}
export async function deleteFileEnquiry(dir: string, id: string) {
  if (!validId(id)) throw new Error("Invalid enquiry id");
  await unlink(path.join(dir, `${id}.json`)).catch((e) => { if (e.code !== "ENOENT") throw e; });
  await unlink(path.join(notificationDir(dir), `${id}.json`)).catch(() => {});
}
