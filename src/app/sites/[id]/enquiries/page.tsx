import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getManageStore } from "@/lib/storage";
import { getDict } from "@/lib/i18n";
import { EnquiryList } from "@/components/editor/EnquiryList";
import { EnquiryNotifications } from "@/components/editor/EnquiryNotifications";
import { notificationSettingsView } from "@/lib/enquiries/notification-settings";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> };
async function Inbox({ params, searchParams }: Props) {
  const { id } = await params, { page: requested } = await searchParams;
  const page = /^\d+$/.test(requested ?? "") ? Math.min(Math.max(Number(requested), 1), 20) : 1;
  const store = await getManageStore(), site = await store.getSite(id);
  if (!site) notFound();
  const [{ locale, t }, records] = await Promise.all([getDict(), store.listEnquiries(id, 51, (page - 1) * 50)]);
  return <main className="mx-auto w-full max-w-3xl px-5 py-10"><Link href={`/sites/${id}`} className="text-sm underline underline-offset-4">{site.name}</Link><h1 className="mt-6 text-3xl font-semibold">{t.enquiries.title}</h1>
    <div className="mt-6 rounded-2xl border border-line bg-panel"><EnquiryNotifications siteId={id} locale={locale} settings={await notificationSettingsView(site)} /><EnquiryList siteId={id} records={records.slice(0, 50)} locale={locale} t={t.enquiries} /></div>
    <nav className="mt-5 flex justify-between gap-5 text-sm">{page > 1 ? <Link href={`?page=${page - 1}`}>{t.enquiries.previous}</Link> : <span />}{records.length > 50 && <Link href={`?page=${page + 1}`}>{t.enquiries.next}</Link>}</nav>
  </main>;
}
export default function EnquiriesPage(props: Props) { return <Suspense fallback={<div className="min-h-dvh" />}><Inbox {...props} /></Suspense>; }
