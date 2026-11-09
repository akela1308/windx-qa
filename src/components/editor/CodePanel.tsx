"use client";

import { useActionState, useEffect, useState } from "react";
import { contentCopy } from "@/lib/content/copy";
import { codeAction } from "@/app/code-actions";
import type { EditState } from "@/app/actions";
import type { EditorData, EditorT } from "./Editor";
import { EditReview } from "./EditReview";
import { fmt } from "@/lib/i18n/format";
import { CodeDraftNotice } from "./CodeDraftNotice";
import { useCodeDraft } from "./useCodeDraft";
import { draftCopy } from "@/lib/editor-drafts/copy";
import { placeOf } from "./FactsPanel";

export function CodePanel({ data, t, selectedIndex, onDirty }: { data: EditorData; t: EditorT; selectedIndex?: number; onDirty: (dirty: boolean) => void }) {
  const c = t.code;
  const [selected, setSelected] = useState(selectedIndex === undefined ? "new" : String(selectedIndex));
  const [state, action, pending] = useActionState(codeAction.bind(null, data.siteId), data.pendingEdit ?? { status: "idle" } as EditState);
  const active = data.codeBlocks.find((b) => String(b.index) === selected);
  const review = state.status === "review" ? state : data.pendingEdit;
  const draft = useCodeDraft(data.draftOwner, data.siteId, data.currentVersion, state.status === "review");
  const initial = (selection: string) => {
    const block = data.codeBlocks.find(b => String(b.index) === selection)?.code;
    return { title: block?.title ?? c.defaultName, html: block?.html ?? "", css: block?.css ?? "", js: block?.js ?? "", height: String(block?.height ?? 400), mobileHeight: String(block?.mobileHeight ?? 500), after: "footer" };
  };
  const [values, setValues] = useState(() => initial(selected));
  const dirty = !review && JSON.stringify(values) !== JSON.stringify(initial(selected));
  useEffect(() => { onDirty(dirty || pending); return () => onDirty(false); }, [dirty, pending, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const before = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  const choose = (selection: string) => {
    if (pending || dirty && !window.confirm(contentCopy(data.locale).leave)) return;
    draft.clear(); setSelected(selection); setValues(initial(selection));
  };
  const change = (key: keyof typeof values, value: string) => {
    const next = {...values, [key]: value};
    setValues(next);
    if (JSON.stringify(next) === JSON.stringify(initial(selected))) draft.clear();
    else draft.save(selected, next);
  };
  const field = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-ink";
  return <div className="p-4 text-sm">
    <h2 className="font-display text-lg font-bold">{c.title}</h2>
    <p className="mt-2 leading-relaxed text-muted">{c.intro}</p>
    <p className="mt-2 leading-relaxed text-muted">{c.publicCode}</p>
    {state.status === "error" && <p role="alert" className="mt-3 text-warn">{c.error}</p>}
    {state.status === "ok" && <p role="status" className="mt-3">{c.saved}</p>}
    {!review && draft.candidate && <CodeDraftNotice draft={draft.candidate} locale={data.locale}
      stale={draft.candidate.baseVersion !== data.currentVersion || (draft.candidate.selection !== "new" && !data.codeBlocks.some(b => String(b.index) === draft.candidate!.selection))}
      restore={() => { const saved = draft.candidate!; setSelected(saved.selection); setValues(saved.values); draft.restore(); }} discard={draft.clear} />}
    {!review && !draft.candidate && draft.status !== "idle" && <p role={draft.status === "unavailable" ? "alert" : "status"} className="mt-3 text-xs leading-relaxed text-muted">{draftCopy(data.locale)[draft.status]}</p>}
    {review ? <ul className="mt-4"><EditReview state={review} siteId={data.siteId} currentVersion={data.currentVersion} t={t} action={action} pending={pending} /></ul> : draft.ready && !draft.candidate ? <>
      <label className="mt-4 block">{c.choose}
        <select aria-label={c.choose} value={selected} disabled={pending} onChange={(e) => choose(e.target.value)} className={field}>
          <option value="new">{c.newSection}</option>
          {data.codeBlocks.map((b) => <option key={b.index} value={b.index}>{b.code.title}</option>)}
        </select>
      </label>
      <form key={`${selected}-${data.currentVersion}`} action={action} className="mt-4 space-y-4">
        <input type="hidden" name="index" value={active ? String(active.index) : "new"} />
        <input type="hidden" name="baseVersion" value={data.currentVersion} />
        <label className="block">{c.name}<input name="title" required maxLength={80} value={values.title} onChange={e=>change("title",e.target.value)} disabled={pending} className={field} /></label>
        {!active && <label className="block">{c.position}
          <select name="after" aria-label={c.position} value={values.after} onChange={e=>change("after",e.target.value)} disabled={pending} className={field}>
            <option value="footer">{c.beforeFooter}</option>
            {data.sections.map((s) => <option key={s.index} value={s.index}>{fmt(c.afterBlock, { n: s.index + 1 })}: {t.places[placeOf(s.composition).place]}</option>)}
          </select>
        </label>}
        {(["html", "css", "js"] as const).map((key) => <label key={key} className="block">{key === "js" ? "JavaScript" : key.toUpperCase()}
          <textarea name={key} aria-label={key === "js" ? "JavaScript" : key.toUpperCase()} maxLength={key === "html" ? 50000 : 30000} value={values[key]} onChange={e=>change(key,e.target.value)} disabled={pending} rows={key === "html" ? 7 : 5} spellCheck={false} autoCapitalize="off" className={`${field} font-mono text-xs leading-relaxed`} />
        </label>)}
        <div className="grid grid-cols-2 gap-3">
          <label>{c.desktopHeight}<input name="height" type="number" required min={120} max={2000} value={values.height} onChange={e=>change("height",e.target.value)} disabled={pending} className={field} /></label>
          <label>{c.mobileHeight}<input name="mobileHeight" type="number" required min={120} max={2000} value={values.mobileHeight} onChange={e=>change("mobileHeight",e.target.value)} disabled={pending} className={field} /></label>
        </div>
        <p className="text-xs leading-relaxed text-muted">{c.limitations}</p>
        <div className="flex flex-wrap gap-2">
          <button name="intent" value="save" disabled={pending} className="rounded-full bg-ink px-4 py-2 text-bg disabled:opacity-50">{pending ? t.working : c.preview}</button>
          {dirty && <button type="button" disabled={pending} onClick={() => { setValues(initial(selected)); draft.clear(); }} className="rounded-full border border-line px-4 py-2 disabled:opacity-50">{contentCopy(data.locale).reset}</button>}
          {active && <button name="intent" value="remove" formNoValidate disabled={pending} className="rounded-full border border-line px-4 py-2 disabled:opacity-50">{c.remove}</button>}
        </div>
      </form>
    </> : null}
  </div>;
}
