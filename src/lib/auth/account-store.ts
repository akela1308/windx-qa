import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
export const dataRoot = () => process.env.WINDX_DATA_DIR ?? path.join(process.cwd(), "data");
export const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export const authFile = (kind: string, key: string) => path.join(dataRoot(), "auth", kind, `${digest(key)}.json`);
export async function readJson<T>(name: string): Promise<T | null> {
  try { return JSON.parse(await readFile(name, "utf8")) as T; }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; throw e; }
}
export async function insertJson(name: string, value: unknown) {
  await mkdir(path.dirname(name), { recursive: true, mode: 0o700 });
  await writeFile(name, JSON.stringify(value), { flag: "wx", mode: 0o600 });
}
export async function replaceJson(name: string, value: unknown) {
  await mkdir(path.dirname(name), { recursive: true, mode: 0o700 });
  const tmp = `${name}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(value), { flag: "wx", mode: 0o600 });
  await rename(tmp, name);
}
// Файловое хранилище работает в одной реплике. Сериализация предотвращает потерю
// подтверждения почты при одновременной смене пароля/привязке Google.
const queues = new Map<string, Promise<unknown>>();
export async function serialAuth<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const full = `${dataRoot()}:${key}`;
  const next = (queues.get(full) ?? Promise.resolve()).catch(() => {}).then(operation);
  queues.set(full, next);
  try { return await next; } finally { if (queues.get(full) === next) queues.delete(full); }
}
export const serialAccount = <T>(email: string, operation: () => Promise<T>) => serialAuth(`account:${email}`, operation);
export async function sessionGeneration(id: string) {
  return (await readJson<{ n: number }>(authFile("session-versions", id)))?.n ?? 0;
}
export async function revokeUserSessions(id: string) {
  const n = await sessionGeneration(id) + 1;
  await replaceJson(authFile("session-versions", id), { n });
  return n;
}
