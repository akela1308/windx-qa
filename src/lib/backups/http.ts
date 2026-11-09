import { requestHostname } from "@/lib/domains/hostname";
import { BackupError, MAX_BACKUP } from "./format";
export const backupHeaders = {"cache-control": "private, no-store", "x-content-type-options": "nosniff", "x-robots-tag": "noindex, nofollow"};
export function sameOrigin(req: Request) {
  const host = req.headers.get("x-windx-request-host") ?? req.headers.get("host") ?? "";
  try { return !!requestHostname(host) && new URL(req.headers.get("origin") ?? "").host === host; } catch { return false; }
}
export async function readBackupBody(req: Request) {
  if (!req.headers.get("content-type")?.startsWith("application/json")) throw new BackupError("format");
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BACKUP) throw new BackupError("size");
  const reader = req.body?.getReader();
  if (!reader) throw new BackupError("format");
  const chunks: Uint8Array[] = []; let total = 0;
  const timeout = setTimeout(() => { void reader.cancel().catch(() => {}); }, 120_000);
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      total += value.length;
      if (total > MAX_BACKUP) { await reader.cancel(); throw new BackupError("size"); }
      chunks.push(value);
    }
  } finally { clearTimeout(timeout); }
  return Buffer.concat(chunks);
}
export function backupFailure(e: unknown) {
  const code = e instanceof BackupError ? e.code : "storage";
  return Response.json({error: code}, {status: code === "size" ? 413 : code === "busy" ? 429 : code === "storage" ? 503 : 400, headers: backupHeaders});
}
