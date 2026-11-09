import type { CodeDraft } from "@/lib/editor-drafts/code";
import { draftCopy } from "@/lib/editor-drafts/copy";

export function CodeDraftNotice({ draft, locale, stale, restore, discard }: {
  draft: CodeDraft; locale: string; stale: boolean; restore: () => void; discard: () => void;
}) {
  const c = draftCopy(locale);
  return <section aria-label={c.found} className="my-4 rounded-xl border border-line p-3">
    <h3 className="font-bold">{c.found}</h3>
    <p className="mt-2">{stale ? c.stale : c.intro}</p>
    <details className="mt-3"><summary className="cursor-pointer underline">{c.inspect}</summary>
      <p className="mt-2 break-words">{draft.values.title}</p>
      {(["html", "css", "js"] as const).map(key => <label key={key} className="mt-2 block">{key.toUpperCase()}
        <textarea readOnly aria-label={`${c.inspect}: ${key.toUpperCase()}`} value={draft.values[key]} rows={4} className="w-full rounded border border-line bg-bg p-2 font-mono text-xs" />
      </label>)}
    </details>
    <div className="mt-3 flex flex-wrap gap-2">
      {!stale && <button type="button" onClick={restore} className="rounded-full bg-ink px-3 py-2 text-bg">{c.restore}</button>}
      <button type="button" onClick={discard} className="rounded-full border border-line px-3 py-2">{c.discard}</button>
    </div>
  </section>;
}
