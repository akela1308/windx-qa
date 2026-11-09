import type { TextDraft } from "@/lib/editor-drafts/text";
import { textDraftCopy } from "@/lib/editor-drafts/text-copy";
import { contentLabel } from "@/lib/content/copy";

export function TextDraftNotice({ draft, locale, stale, busy = false, restore, discard }: {
  draft: TextDraft; locale: string; stale: boolean; busy?: boolean; restore: () => void; discard: () => void;
}) {
  const c = textDraftCopy(locale);
  return <section aria-label={`${c.found}: ${draft.index + 1}`} className="my-4 rounded-xl border border-line p-3">
    <h3 className="font-bold">{c.found}</h3>
    <p className="mt-1 text-xs text-muted">{draft.index === -1 ? c.meta : `${c.section} ${draft.index + 1}`}</p>
    <p className="mt-2">{stale ? c.stale : c.intro}</p>
    <details className="mt-3"><summary className="cursor-pointer underline">{c.inspect}</summary>
      {draft.changes.map(change => <label key={change.path} className="mt-2 block">{contentLabel(change.path, locale)}
        <textarea readOnly aria-label={`${c.inspect}: ${contentLabel(change.path, locale)}`} value={change.value} rows={3} className="w-full rounded border border-line bg-bg p-2 text-sm" />
      </label>)}
    </details>
    <div className="mt-3 flex flex-wrap gap-2">
      {!stale && <button type="button" disabled={busy} onClick={restore} className="rounded-full bg-ink px-3 py-2 text-bg">{c.restore}</button>}
      <button type="button" disabled={busy} onClick={discard} className="rounded-full border border-line px-3 py-2">{c.discard}</button>
    </div>
  </section>;
}
