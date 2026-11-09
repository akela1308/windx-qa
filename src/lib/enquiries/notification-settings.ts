import { randomUUID } from "node:crypto";
import { currentUser } from "@/lib/auth/session";
import { accountSummary } from "@/lib/auth/accounts";
import { getManageStore } from "@/lib/storage";
import type { Site } from "@/lib/storage/types";
import { mailMode } from "@/lib/mail/transport";
export type NotificationSettingsView = { email: string | null; verified: boolean; enabled: boolean; available: boolean };
export async function notificationSettingsView(site: Site): Promise<NotificationSettingsView> {
  const user = await currentUser();
  let verified = false;
  if (user && user.id === site.ownerId) { try { verified = (await accountSummary(user)).verified; } catch {} }
  return { email: user && user.id === site.ownerId ? user.email : null, verified, enabled: !!site.enquiryNotifications?.enabled && site.enquiryNotifications.ownerId === user?.id && site.enquiryNotifications.email === user?.email, available: mailMode() !== "disabled" };
}
export async function configureEnquiryNotifications(siteId: string, enabled: boolean, locale: string) {
  const store = await getManageStore(), site = await store.getSite(siteId), user = await currentUser();
  if (!site || !user || site.ownerId !== user.id) throw new Error("Site not found");
  // Никогда не берём получателя из формы или AI-документа.
  if (enabled && !(await accountSummary(user)).verified) throw new Error("Confirm account email first");
  const same = site.enquiryNotifications?.enabled === enabled && site.enquiryNotifications.email === user.email && site.enquiryNotifications.ownerId === user.id;
  await store.saveSite({ ...site,
    enquiryRecipient: site.enquiryRecipient ?? (enabled ? { email: user.email, confirmedAt: new Date().toISOString() } : undefined),
    enquiryNotifications: { id: same ? site.enquiryNotifications!.id : randomUUID(), enabled, ownerId: user.id, email: user.email, locale: ["ru", "es"].includes(locale) ? locale : "en" },
  });
}
