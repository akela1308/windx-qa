"use client";

import type { EditState } from "@/app/actions";
import { useEffect, useRef } from "react";
import { fmt } from "@/lib/i18n/format";
import type { EditorT } from "./Editor";
import { placeOf } from "./FactsPanel";

export function EditReview({ state, siteId, currentVersion, t, action, pending }: {
  state: Extract<EditState, { status: "review" }>; siteId: string; currentVersion: number;
  t: EditorT; action: (form: FormData) => void; pending: boolean;
}) {
  const r = t.review;
  const stale = state.baseVersion !== currentVersion;
  const reviewRef = useRef<HTMLLIElement>(null);
  useEffect(() => { reviewRef.current?.scrollIntoView({ block: "start" }); }, [state.id]);
  return <li ref={reviewRef} className="rounded-xl border border-brand p-4 text-sm">
    <h3 className="font-bold">{r.title}</h3>
    <p className="mt-2">{r.intro}</p>
    {state.reply && <p className="mt-2 text-muted">{state.reply}</p>}
    {!state.changes.length && <p className="mt-2">{r.noChange}</p>}
    {state.changes.map((change, i) => {
      const place = change.area === "style" ? r.style : change.area === "facts" ? t.tabs.facts : t.places[placeOf(change.area).place];
      return <details key={i} className="mt-3 border-t border-line pt-2" open>
        <summary className="cursor-pointer font-medium">
          {change.index === undefined ? place : fmt(r.block, { n: change.index + 1, place })}
          {change.layout && <span className="ml-2 text-warn">{r.layout}</span>}
        </summary>
        {!change.before && !change.after ? <p className="mt-2 text-muted">{r.textUnchanged}</p> : <>
        <p className="mt-2 text-xs text-muted">{r.before}</p>
        <p className="whitespace-pre-wrap break-words">{change.before || r.empty}</p>
        <p className="mt-2 text-xs text-muted">{r.after}</p>
        <p className="whitespace-pre-wrap break-words">{change.after || r.empty}</p>
        </>}
      </details>;
    })}
    <a className="mt-3 block underline" href={`/preview/${siteId}/pending?edit=${state.id}`} target="_blank" rel="noopener">{r.preview}</a>
    {stale && <p role="alert" className="mt-3 text-warn">{r.stale}</p>}
    <form action={action} className="mt-4 flex flex-wrap gap-2">
      <input type="hidden" name="editId" value={state.id} />
      <button name="decision" value="apply" disabled={pending || stale || !state.changes.length} className="rounded-full bg-ink px-4 py-2 text-bg disabled:opacity-50">{r.apply}</button>
      <button name="decision" value="discard" disabled={pending} className="rounded-full border border-line px-4 py-2 disabled:opacity-50">{r.discard}</button>
    </form>
  </li>;
}
