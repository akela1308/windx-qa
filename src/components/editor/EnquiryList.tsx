"use client";
import { useDateFormatter } from "@/lib/i18n/use-date-formatter";
import { useState, useTransition } from "react";
import { deleteEnquiryAction } from "@/app/enquiry-actions";
import type { Dict } from "@/lib/i18n";
import type { Enquiry } from "@/lib/enquiries/types";
import { notificationCopy } from "@/lib/enquiries/notification-copy";

export function EnquiryList({ siteId, records, locale, t }: { siteId: string; records: Enquiry[]; locale: string; t: Dict["enquiries"] }) {
  const [pending, start] = useTransition(); const [error, setError] = useState(false);
  const c = notificationCopy(locale);
  const date = useDateFormatter(locale, { dateStyle: "medium", timeStyle: "short" });
  return <>
    {error && <p role="alert" className="p-4 text-warn">{t.error}</p>}
    {records.length === 0 && <p className="p-4 text-muted">{t.empty}</p>}
    <ol className="divide-y divide-line">{records.map((record) => <li key={record.id} id={`enquiry-${record.id}`} className="scroll-mt-6 p-4 text-sm">
      <p className="font-medium break-words">{record.name || t.anonymous}</p><p className="mt-1 text-xs text-muted">{date.format(new Date(record.createdAt))}</p>
      <a className="mt-3 inline-block max-w-full break-words underline underline-offset-4" href={record.contact.includes("@") ? `mailto:${encodeURIComponent(record.contact)}` : `tel:${record.contact.replace(/[^\d+]/g, "")}`}>{record.contact}</a>
      <p className="mt-3 whitespace-pre-wrap break-words leading-relaxed">{record.message}</p>
      <p className="mt-3 text-xs leading-relaxed text-muted">{record.notification?.status === "queued" ? c.queued : record.notification?.status === "sent" ? c.sent : record.notification?.status === "failed" ? c.failed : record.notification?.status === "cancelled" ? c.cancelled : c.notSent}</p>
      <button disabled={pending} className="mt-4 text-xs text-warn underline underline-offset-4 disabled:opacity-50" onClick={() => { if (window.confirm(t.confirmDelete)) start(async () => { try { setError(false); await deleteEnquiryAction(siteId, record.id); } catch { setError(true); } }); }}>{t.remove}</button>
    </li>)}</ol>
  </>;
}
