"use client";
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { enquiryNotificationsAction } from "@/app/enquiry-actions";
import { notificationCopy } from "@/lib/enquiries/notification-copy";
import type { NotificationSettingsView } from "@/lib/enquiries/notification-settings";
export function EnquiryNotifications({ siteId, locale, settings }: { siteId: string; locale: string; settings: NotificationSettingsView }) {
  const c = notificationCopy(locale), router = useRouter();
  const [state, action, pending] = useActionState(enquiryNotificationsAction.bind(null, siteId), "");
  return <section className="border-b border-line p-4 text-sm">
    <h3 className="font-medium">{c.title}</h3><p className="mt-2 leading-relaxed text-muted">{c.help}</p>
    {settings.email && <p className="mt-2 break-words">{settings.email}</p>}
    <p className="mt-2 font-medium">{settings.enabled ? c.on : c.off}</p>
    {!settings.verified && <p className="mt-2 text-muted">{c.verify} <Link href="/account" className="underline">{c.account}</Link></p>}
    {!settings.available && <p className="mt-2 text-muted">{c.unavailable}</p>}
    <form action={action} className="mt-3"><input type="hidden" name="enabled" value={settings.enabled ? "0" : "1"} />
      <button disabled={pending || !settings.enabled && !settings.verified} className="min-h-11 rounded-full border border-line px-4 py-2 disabled:opacity-50">{settings.enabled ? c.disable : c.enable}</button>
    </form>
    {state === "error" && <p role="alert" className="mt-2 text-warn">{c.error}</p>}
    <button type="button" onClick={() => router.refresh()} className="mt-3 min-h-11 underline underline-offset-4">{c.refresh}</button>
  </section>;
}
