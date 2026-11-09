import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { dataRoot } from "@/lib/auth/account-store";
import { authOrigin } from "@/lib/auth/google";

export type SecurityMail = { to: string; subject: string; text: string; html: string; id: string };
export class MailDeliveryError extends Error {
  constructor(public retryable: boolean, public retryAfterMs = 0) { super("Mail delivery rejected"); }
}
export function mailMode(): "resend" | "file" | "disabled" {
  const mode = process.env.WINDX_MAIL_PROVIDER;
  if (mode === "file" && process.env.WINDX_MAIL_TEST === "1") {
    // Тестовый ящик никогда не включается для публичного домена, даже в production-сборке тестов.
    const host = new URL(authOrigin()).hostname;
    if (["localhost", "127.0.0.1", "[::1]"].includes(host)) return "file";
  }
  if (mode === "resend" && process.env.RESEND_API_KEY && z.email().safeParse(process.env.WINDX_MAIL_FROM).success) return "resend";
  return "disabled";
}
export async function sendSecurityMail(mail: SecurityMail, send: typeof fetch = fetch) {
  if (!z.email().safeParse(mail.to).success) throw new Error("Invalid recipient");
  const mode = mailMode();
  if (mode === "file") {
    const dir = path.join(dataRoot(), "auth", "test-outbox");
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await writeFile(path.join(dir, `${randomUUID()}.json`), JSON.stringify(mail), { flag: "wx", mode: 0o600 });
    return;
  }
  if (mode !== "resend") throw new Error("Mail unavailable");
  const response = await send("https://api.resend.com/emails", {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000), cache: "no-store",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": mail.id },
    body: JSON.stringify({ from: `WINDX <${process.env.WINDX_MAIL_FROM}>`, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
  });
  // Ответ поставщика может содержать персональные данные. Не включаем его в исключения/логи.
  if (!response.ok) {
    const retryAfter = Number(response.headers.get("retry-after"));
    await response.body?.cancel();
    throw new MailDeliveryError(response.status === 429 || response.status >= 500 || response.status === 409, Number.isFinite(retryAfter) ? Math.min(Math.max(0, retryAfter * 1000), 6 * 3600_000) : 0);
  }
  const result = await response.json() as { id?: string };
  if (!result.id) throw new Error("Mail delivery unconfirmed");
}
