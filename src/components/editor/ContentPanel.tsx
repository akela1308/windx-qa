"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { contentAction } from "@/app/content-actions";
import type { EditState } from "@/app/actions";
import { newImageSection } from "@/lib/content/new-image";
import { contentCopy, contentLabel } from "@/lib/content/copy";
import type { EditorData, EditorT } from "./Editor";
import { EditReview } from "./EditReview";
import { ImageField } from "./ImageField";
import { ImagePlan } from "./ImagePlan";
import { placeOf } from "./FactsPanel";
import Link from "next/link";
import { useTextDrafts } from "./useTextDrafts";
import { TextDraftNotice } from "./TextDraftNotice";
import { canRestoreText, textDraftChanges, type TextDraft } from "@/lib/editor-drafts/text";
import { textDraftCopy } from "@/lib/editor-drafts/text-copy";
import { freeCopy } from "@/lib/free-editor/copy";

export function ContentPanel({ data, t, selectedIndex, onDirty }: { data: EditorData; t: EditorT; selectedIndex?: number; onDirty: (dirty: boolean) => void }) {
  const c = contentCopy(data.locale);
  const [index, setIndex] = useState(selectedIndex ?? data.content[1]?.index ?? -1);
  const [imageAfter,setImageAfter] = useState<number>();
  const section = index === -2 ? newImageSection : data.content.find(s => s.index === index) ?? data.content[0];
  const initial = () => Object.fromEntries(section.fields.map(f => [f.path, f.kind === "photo" ? f.photo ?? null : f.value]));
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [resolved, setResolved] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [state, action, pending] = useActionState(contentAction.bind(null, data.siteId), { status: "idle" } as EditState);
  const drafts = useTextDrafts(data.draftOwner, data.siteId, data.currentVersion, state.status === "review", section.index);
  const [dismissed, setDismissed] = useState<EditState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const error = state.status === "error" && dismissed !== state ? state : null;
  useEffect(() => {
    if (state.status !== "error") return;
    const target = Array.from(formRef.current?.querySelectorAll<HTMLElement>("[data-content-path]") ?? []).find(el => el.dataset.contentPath === state.field);
    (target ?? errorRef.current)?.focus();
  }, [state]);
  const review = data.pendingEdit ?? (state.status === "review" && state.baseVersion === data.currentVersion ? state : null);
  const changes = section.fields.filter(f => JSON.stringify(values[f.path]) !== JSON.stringify(f.kind === "photo" ? f.photo ?? null : f.value)).map(f => ({ path: f.path, value: values[f.path] }));
  const dirty = !review && changes.length > 0;
  useEffect(() => { onDirty(dirty || uploading || pending); return () => onDirty(false); }, [dirty, uploading, pending, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  // Уже записанный текст можно оставить без потери; изображения и отметки требуют предупреждения.
  const needsConfirmation = dirty && (drafts.status !== "saved" || section.index === -2 || resolved.length > 0 || changes.some(change => section.fields.find(f => f.path === change.path)?.kind === "photo"));
  const changeSection = (next: number) => {
    if (uploading || pending || needsConfirmation && !window.confirm(textDraftCopy(data.locale).leave)) return false;
    drafts.load(); setIndex(next); setResolved([]); setDismissed(state);
    const s = next === -2 ? newImageSection : data.content.find(s => s.index === next)!;
    setValues(Object.fromEntries(s.fields.map(f => [f.path, f.kind === "photo" ? f.photo ?? null : f.value])));
    setImageAfter(undefined);
    return true;
  };
  const changeValue = (path: string, value: unknown) => {
    const next = { ...values, [path]: value };
    setValues(next);
    if (section.index !== -2) drafts.save(section.index, section.composition, textDraftChanges(section, next));
  };
  const restore = (draft: TextDraft) => {
    if (!canRestoreText(draft, data.currentVersion, data.content) || uploading || pending || needsConfirmation && !window.confirm(textDraftCopy(data.locale).leave)) return;
    const target = data.content.find(s => s.index === draft.index)!;
    const restored = Object.fromEntries(target.fields.map(f => [f.path, f.kind === "photo" ? f.photo ?? null : f.value]));
    for (const change of draft.changes) restored[change.path] = change.value;
    setIndex(draft.index); setValues(restored); setResolved([]); setDismissed(state); drafts.restore(draft.index);
  };
  const blockedByDraft = drafts.drafts.some(d => d.index === section.index);
  const field = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-ink";
  return <div className="p-4 text-sm">
    <h2 className="font-display text-lg font-bold">{c.title}</h2><p className="mt-2 text-muted">{c.intro}</p>
    {!review&&<ImagePlan images={data.imagePlan??[]} locale={data.locale} onSection={changeSection} onAdd={target=>{if(changeSection(-2))setImageAfter(target);}}/>}
    {error && !error.field && <p ref={errorRef} tabIndex={-1} role="alert" className="mt-3 text-warn">{error.message ?? c.error}</p>}
    {state.status === "ok" && <p role="status" className="mt-3">{c.saved}</p>}
    {!review && drafts.drafts.map(draft => <TextDraftNotice key={draft.index} draft={draft} locale={data.locale}
      stale={!canRestoreText(draft, data.currentVersion, data.content)} busy={uploading || pending} restore={() => restore(draft)} discard={() => drafts.clear(draft.index)} />)}
    {!review && drafts.status !== "idle" && <p role={drafts.status === "unavailable" ? "alert" : "status"} className="mt-3 text-xs leading-relaxed text-muted">{textDraftCopy(data.locale)[drafts.status]}</p>}
    {review ? <ul className="mt-4"><EditReview state={review} siteId={data.siteId} currentVersion={data.currentVersion} t={t} action={action} pending={pending} /></ul> : <>
      <label className="mt-4 block">{c.choose}<select aria-label={c.choose} value={section.index} disabled={uploading || pending} onChange={e => changeSection(Number(e.target.value))} className={field}>{data.content.map(s => <option key={s.index} value={s.index}>{s.index === -1 ? c.meta : `${c.block} ${s.index + 1}: ${t.places[placeOf(s.composition).place]}`}</option>)}<option value={-2}>{imageAfter!==undefined ? (data.locale === "ru" ? `Добавить после раздела ${imageAfter+1}` : data.locale === "es" ? `Añadir después de la sección ${imageAfter+1}` : `Add after section ${imageAfter+1}`) : data.locale === "ru" ? "Добавить изображение перед подвалом" : data.locale === "es" ? "Añadir imagen antes del pie" : "Add image before footer"}</option></select></label>
      {!section.fields.length && (section.composition==="free.canvas"?<Link className="mt-4 inline-flex min-h-11 items-center underline" href={`/sites/${data.siteId}/canvas?section=${data.canvasBlocks.find(b=>b.index===section.index)?.id}`}>{freeCopy(data.locale).open}</Link>:<p className="mt-4 text-muted">{c.empty}</p>)}
      {drafts.ready && !blockedByDraft && <form ref={formRef} action={action} noValidate onChange={() => setDismissed(state)} className="mt-4 space-y-4">
        <input type="hidden" name="baseVersion" value={data.currentVersion} /><input type="hidden" name="section" value={section.index === -2 ? -1 : section.index} /><input type="hidden" name="intent" value={section.index === -2 ? "add-image" : "update"} /><input type="hidden" name="changes" value={JSON.stringify(changes)} />
        {section.index===-2&&imageAfter!==undefined&&<><input type="hidden" name="afterSection" value={imageAfter}/><p>{data.locale==="ru"?`Изображение появится после раздела ${imageAfter+1}.`:data.locale==="es"?`La imagen aparecerá después de la sección ${imageAfter+1}.`:`The image will appear after section ${imageAfter+1}.`}</p></>}
        {section.fields.map((f, n) => <div key={`${section.index}-${f.path}`}><span className="font-medium">{contentLabel(f.path, data.locale)}</span>
          <div data-content-path={f.kind === "photo" ? f.path : undefined} tabIndex={f.kind === "photo" ? -1 : undefined} aria-describedby={error?.field === f.path ? `content-error-${n}` : undefined}>
          {f.kind === "photo" ? <ImageField field={f} value={values[f.path] as typeof f.photo ?? null} onChange={v => { changeValue(f.path, v); setDismissed(state); }} siteId={data.siteId} locale={data.locale} busy={uploading} pending={pending} setBusy={setUploading} /> : <textarea data-content-path={f.path} aria-invalid={error?.field === f.path || undefined} aria-describedby={error?.field === f.path ? `content-error-${n}` : undefined} aria-label={contentLabel(f.path, data.locale)} rows={f.kind === "link" || f.max <= 80 ? 2 : 3} required={f.required} maxLength={f.max} disabled={uploading || pending} value={String(values[f.path] ?? "")} onChange={e => changeValue(f.path, e.target.value)} className={field} />}
          </div>
          {error?.field === f.path && <p id={`content-error-${n}`} role="alert" className="mt-2 text-warn">{error.message ?? c.error}</p>}
        </div>)}
        {!!section.facts?.filter(f => data.facts.find(x => x.fact === f.fact)?.status !== "confirmed").length && <fieldset className="space-y-2 rounded-lg border border-line p-3"><legend className="px-1 font-medium">{t.tabs.facts}</legend>{section.facts.filter(f => data.facts.find(x => x.fact === f.fact)?.status !== "confirmed").map(f => <label key={f.fact} className="flex items-start gap-2"><input type="checkbox" name="resolvedFact" value={f.fact} checked={resolved.includes(f.fact)} onChange={e => setResolved(old => e.target.checked ? [...old, f.fact] : old.filter(x => x !== f.fact))} disabled={!dirty || uploading || pending} className="mt-1" /><span>{c.resolveFact} <strong className="font-medium">{f.fact}</strong></span></label>)}</fieldset>}
        <p className="text-xs text-muted">{c.unpublished}</p>
        <div className="flex flex-wrap gap-2"><button disabled={!dirty || uploading || pending} className="rounded-full bg-ink px-4 py-2 text-bg disabled:opacity-50">{pending ? c.saving : c.preview}</button><button type="button" disabled={!dirty || uploading || pending} onClick={() => { setValues(initial()); setResolved([]); setDismissed(state); drafts.clear(section.index); }} className="rounded-full border border-line px-4 py-2 disabled:opacity-50">{c.reset}</button></div>
      </form>}
    </>}
  </div>;
}
