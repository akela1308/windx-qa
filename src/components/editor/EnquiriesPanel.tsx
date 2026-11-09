"use client";
import { useActionState } from "react";
import Link from "next/link";
import { enquiryFormAction } from "@/app/enquiry-actions";
import type { EditState } from "@/app/actions";
import type { EditorData, EditorT } from "./Editor";
import { EditReview } from "./EditReview";
import { EnquiryRecipient } from "./EnquiryRecipient";
import { EnquiryList } from "./EnquiryList";
import { EnquiryNotifications } from "./EnquiryNotifications";

export function EnquiriesPanel({ data, t }: { data: EditorData; t: EditorT }) {
  const [state, action, pending] = useActionState(enquiryFormAction.bind(null, data.siteId), data.pendingEdit ?? { status: "idle" } as EditState);
  return <div>
    <EnquiryRecipient data={data} t={t} />
    {data.enquiries.notifications && <EnquiryNotifications siteId={data.siteId} locale={data.locale} settings={data.enquiries.notifications} />}
    <div className="border-b border-line p-4 text-sm">
      {!data.enquiries.enabled && <p className="mb-3 text-muted">{t.enquiries.noForm}</p>}
      <form action={action} className="flex flex-wrap gap-2"><input type="hidden" name="baseVersion" value={data.currentVersion} />
        <button name="kind" value="full" disabled={pending || !!data.pendingEdit} className="rounded-full border border-line px-3 py-2 disabled:opacity-50">{t.enquiries.addFull}</button>
        <button name="kind" value="inline" disabled={pending || !!data.pendingEdit} className="rounded-full border border-line px-3 py-2 disabled:opacity-50">{t.enquiries.addInline}</button>
      </form>
      {state.status === "error" && <p role="alert" className="mt-3 text-warn">{t.enquiries.error}</p>}
      {state.status === "review" && <EditReview state={state} siteId={data.siteId} currentVersion={data.currentVersion} t={t} action={action} pending={pending} />}
    </div>
    <div className="flex items-center justify-between gap-3 px-4 pt-4 text-sm"><h3 className="font-medium">{t.enquiries.latest}</h3><Link href={`/sites/${data.siteId}/enquiries`} className="underline underline-offset-4">{t.enquiries.all}</Link></div>
    <EnquiryList siteId={data.siteId} records={data.enquiries.records} locale={data.locale} t={t.enquiries} />
  </div>;
}
