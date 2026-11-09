import { authFile, readJson } from "@/lib/auth/account-store";
import type { Account } from "@/lib/auth/accounts";
import { authOrigin } from "@/lib/auth/google";
import type { Site } from "@/lib/storage/types";
import type { SecurityMail } from "@/lib/mail/transport";
import type { Enquiry } from "./types";
import { notificationCopy } from "./notification-copy";
export type NotificationJob = { configId: string; ownerId: string; from: string; mail: SecurityMail };
export type StoredEnquiry = Enquiry & { notificationJob?: NotificationJob };
export async function verifiedNotificationOwner(site: Site) {
  const config = site.enquiryNotifications;
  if (!config?.enabled || config.ownerId !== site.ownerId) return false;
  const account = await readJson<Account>(authFile("users", config.email));
  return !!account?.emailVerifiedAt && account.id === site.ownerId && account.email === config.email;
}
const escape = (v: string) => v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
export async function withNotificationJob(site: Site, enquiry: Enquiry): Promise<StoredEnquiry> {
  if (!site.enquiryNotifications?.enabled || site.enquiryNotifications.ownerId !== site.ownerId) return { ...enquiry, notification: { status: "off", attempts: 0 } };
  const config = site.enquiryNotifications!, c = notificationCopy(config.locale);
  const name = site.name.replace(/[\r\n\x00-\x1f\x7f]/g, " ").slice(0, 100);
  const url = `${authOrigin()}/sites/${encodeURIComponent(site.id)}/enquiries#enquiry-${enquiry.id}`;
  const mail = { id: `enquiry/${site.id}/${enquiry.id}/${config.id}`, to: config.email, subject: `${c.subject} ${name}`,
    text: `${c.intro}: ${name}.\n\n${c.open}: ${url}\n\n${c.footer}`,
    html: `<p>${escape(c.intro)}: ${escape(name)}.</p><p><a href="${escape(url)}">${escape(c.open)}</a></p><p>${escape(c.footer)}</p>` };
  // Задача и заявка записываются одним атомарным JSON, отдельного окна потери очереди нет.
  return { ...enquiry, notification: { status: "queued", attempts: 0 }, notificationJob: { configId: config.id, ownerId: config.ownerId, from: process.env.WINDX_MAIL_FROM ?? "", mail } };
}
