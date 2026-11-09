import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile, link, unlink } from "node:fs/promises";
import path from "node:path";
import { dataRoot } from "@/lib/auth/accounts";
import { EnquiryError } from "./types";

export type FormToken = { siteId: string; version: number; publication: string; section: number; at: number; nonce: string };
export async function enquirySecret() {
  const file = path.join(dataRoot(), "auth", "enquiry-key");
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  try { return await readFile(file); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
  const temp = `${file}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(temp, randomBytes(32), { flag: "wx", mode: 0o600 });
  try { await link(temp, file); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e; } finally { await unlink(temp); }
  return readFile(file);
}
export function signFormToken(secret: Buffer, context: Omit<FormToken, "at" | "nonce">) {
  const payload = Buffer.from(JSON.stringify({ ...context, at: Date.now(), nonce: randomBytes(16).toString("hex") })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function verifyFormToken(secret: Buffer, token: string): FormToken {
  if (token.length > 2000) throw new EnquiryError(400, "Please reload the page and try again.");
  const [payload, signature, extra] = token.split(".");
  const expected = createHmac("sha256", secret).update(payload ?? "").digest("base64url");
  if (!payload || !/^[a-zA-Z0-9_-]+$/.test(payload) || extra || !signature || !/^[a-zA-Z0-9_-]{43}$/.test(signature) || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new EnquiryError(403, "Please reload the page and try again.");
  let value: FormToken;
  try { value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { throw new EnquiryError(400, "Please reload the page and try again."); }
  if (!Number.isFinite(value.at) || value.at > Date.now() + 30_000 || Date.now() - value.at > 24 * 60 * 60_000) throw new EnquiryError(410, "This form has expired. Reload the page and try again.");
  return value;
}
