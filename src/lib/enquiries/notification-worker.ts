import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { dataRoot } from "@/lib/auth/account-store";
import { FileSiteStore } from "@/lib/storage/file-store";
import { mailMode, MailDeliveryError, sendSecurityMail, type SecurityMail } from "@/lib/mail/transport";
import { verifiedNotificationOwner, type StoredEnquiry } from "./notification-job";
import { claimNotification, readNotificationStatus, writeNotificationStatus } from "./notification-files";
import { reserveNotificationSend } from "./notification-budget";
// Окно меньше 24 часов хранения ключей Resend. За его пределами не делаем
// автоматическую повторную отправку, даже если ответ первой попытки потерялся.
const RETRY_WINDOW = 22 * 3600_000;
const delays = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3600_000, 6 * 3600_000];
const runtime = globalThis as typeof globalThis & { windxEnquiryWorker?: { busy: boolean; timer?: ReturnType<typeof setInterval> } };
const state = () => runtime.windxEnquiryWorker ??= { busy: false };
export async function processEnquiryNotification(siteId: string, id: string, send: (mail: SecurityMail) => Promise<unknown> = sendSecurityMail, now = Date.now()) {
  if (!/^[a-z0-9-]+$/.test(siteId) || !/^[a-f0-9]{64}$/.test(id)) throw new Error("Invalid notification id");
  const dir = path.join(dataRoot(), "sites", siteId, "enquiries");
  try {
    const candidate: StoredEnquiry = JSON.parse(await readFile(path.join(dir, `${id}.json`), "utf8"));
    if (!candidate.notificationJob) return false;
    const status = await readNotificationStatus(dir, id) ?? candidate.notification!;
    if (status.status !== "queued" || (status.nextAttemptAt ?? 0) > now) return false;
  } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return false; throw e; }
  const release = await claimNotification(dir, id);
  if (!release) return false;
  try {
    let record: StoredEnquiry;
    try { record = JSON.parse(await readFile(path.join(dir, `${id}.json`), "utf8")); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return false; throw e; }
    const job = record.notificationJob;
    if (!job) return false;
    let status = await readNotificationStatus(dir, id) ?? record.notification!;
    if (status.status !== "queued" || (status.nextAttemptAt ?? 0) > now) return false;
    const site = await new FileSiteStore(dataRoot()).getSite(siteId);
    if (!site || site.enquiryNotifications?.id !== job.configId || site.ownerId !== job.ownerId || !await verifiedNotificationOwner(site) || site.enquiryNotifications.email !== job.mail.to) {
      await writeNotificationStatus(dir, id, { ...status, status: "cancelled" }); return false;
    }
    if (status.firstAttemptAt !== undefined && now - status.firstAttemptAt >= RETRY_WINDOW) {
      await writeNotificationStatus(dir, id, { ...status, status: "failed" }); return false;
    }
    if (mailMode() === "disabled") return false;
    if (job.from !== (process.env.WINDX_MAIL_FROM ?? "")) {
      await writeNotificationStatus(dir, id, { ...status, status: "failed" }); return false;
    }
    if (mailMode() === "resend") {
      const next = await reserveNotificationSend(now);
      if (next !== null) {
        const withinWindow = status.firstAttemptAt === undefined || next - status.firstAttemptAt < RETRY_WINDOW;
        await writeNotificationStatus(dir, id, { ...status, status: withinWindow ? "queued" : "failed", nextAttemptAt: withinWindow ? next : undefined });
        return false;
      }
    }
    // До HTTP-запроса сохраняем окно повторов. Payload и ключ неизменны.
    status = { ...status, attempts: status.attempts + 1, firstAttemptAt: status.firstAttemptAt ?? now };
    await writeNotificationStatus(dir, id, status);
    // Повторно убеждаемся, что заявку не удалили во время подготовки.
    try { await readFile(path.join(dir, `${id}.json`)); } catch { return false; }
    try {
      await send(job.mail);
      await writeNotificationStatus(dir, id, { ...status, status: "sent", sentAt: new Date(now).toISOString(), nextAttemptAt: undefined });
    } catch (e) {
      const retry = !(e instanceof MailDeliveryError) || e.retryable;
      const delay = Math.max(delays[Math.min(status.attempts - 1, delays.length - 1)], e instanceof MailDeliveryError ? e.retryAfterMs : 0);
      const next = now + delay;
      const again = retry && next - status.firstAttemptAt! < RETRY_WINDOW;
      await writeNotificationStatus(dir, id, { ...status, status: again ? "queued" : "failed", nextAttemptAt: again ? next : undefined });
    }
    return true;
  } finally { await release(); }
}
export async function drainEnquiryNotifications() {
  const worker = state();
  if (worker.busy || mailMode() === "disabled") return;
  worker.busy = true;
  try {
    const sites = await new FileSiteStore(dataRoot()).listSites();
    let attempts = 0;
    for (const site of sites) {
      const dir = path.join(dataRoot(), "sites", site.id, "enquiries");
      let names: string[];
      try { names = await readdir(dir); } catch { continue; }
      for (const name of names.filter(n => /^[a-f0-9]{64}\.json$/.test(n))) {
        try {
          if (await processEnquiryNotification(site.id, name.slice(0, -5))) {
            if (++attempts >= 10) return;
            if (mailMode() === "resend") await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch { console.error("WINDX enquiry notification processing failed"); }
      }
    }
  } catch { console.error("WINDX enquiry notification scan failed"); }
  finally { worker.busy = false; }
}
export function startEnquiryNotificationWorker() {
  const worker = state();
  if (worker.timer) return;
  worker.timer = setInterval(() => { void drainEnquiryNotifications(); }, 30_000);
  worker.timer.unref();
  void drainEnquiryNotifications();
}
