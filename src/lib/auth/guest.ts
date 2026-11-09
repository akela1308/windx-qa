import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { dataRoot, type Identity } from "./accounts";
import type { SiteStore } from "@/lib/storage/types";

export const GUEST_SECONDS = 30 * 24 * 60 * 60;
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const base = () => path.join(dataRoot(), "auth", "trials");
export const guestIdentity = (): Identity => ({ id: `guest-${randomUUID()}`, email: "", guest: true });
export class TrialLimit extends Error {
  constructor(public reason: "browser" | "daily") { super(`Trial limit: ${reason}`); }
}

async function insert(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, JSON.stringify(value), { flag: "wx", mode: 0o600 });
}
function claimFile(id: string) { return path.join(base(), "claims", `${digest(id)}.json`); }

// Вызывается только для личности из секретной серверной сессии после успешного входа.
// Одноразовая привязка не позволяет двум одновременным входам переприсвоить сайт.
export async function claimGuestSites(raw: SiteStore, guest: Identity, user: Identity) {
  if (!guest.guest || user.guest || !guest.id.startsWith("guest-")) return;
  try { await insert(claimFile(guest.id), { ownerId: user.id }); }
  catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    const claim = JSON.parse(await readFile(claimFile(guest.id), "utf8"));
    if (claim.ownerId !== user.id) return;
  }
  for (const site of await raw.listSites()) {
    if (site.ownerId === guest.id) await raw.saveSite({ ...site, ownerId: user.id });
  }
}

const trialFile = (id: string) => path.join(base(), "browsers", `${digest(id)}.json`);
function limit(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 && value <= 1000 ? value : fallback;
}
async function slot(dir: string, key: string, max: number) {
  for (let n = 0; n < max; n++) {
    const file = path.join(dir, `${key}-${n}.json`);
    try { await insert(file, { at: Date.now() }); return file; }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e; }
  }
  throw new TrialLimit("daily");
}

export async function reserveTrial(guest: Identity, ip: string) {
  if (!guest.guest) return null;
  const file = trialFile(guest.id), attempt = randomUUID();
  try { await insert(file, { attempt }); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "EEXIST") throw new TrialLimit("browser"); throw e; }
  try {
    const secretFile = path.join(base(), "ip-secret.json");
    try { await insert(secretFile, randomBytes(32).toString("hex")); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e; }
    const secret = JSON.parse(await readFile(secretFile, "utf8"));
    const ipKey = createHmac("sha256", secret).update(ip).digest("hex");
    const day = new Date().toISOString().slice(0, 10);
    const dir = path.join(base(), "limits", day);
    // Гипотеза до настройки тарифов: 3 попытки/IP и 20 гостевых генераций/сутки.
    // Счётчики файловые, атомарные, не сбрасываются при перезапуске.
    const globalSlot = await slot(dir, "all", limit("WINDX_TRIAL_DAILY_TOTAL", 20));
    try { await slot(dir, ipKey, limit("WINDX_TRIAL_DAILY_PER_IP", 3)); }
    catch (e) { await unlink(globalSlot); throw e; }
    return { file, attempt };
  } catch (e) { await unlink(file); throw e; }
}
export async function releaseTrial(reservation: Awaited<ReturnType<typeof reserveTrial>>) {
  if (!reservation) return;
  const stored = JSON.parse(await readFile(reservation.file, "utf8"));
  if (stored.attempt === reservation.attempt) await unlink(reservation.file);
}
