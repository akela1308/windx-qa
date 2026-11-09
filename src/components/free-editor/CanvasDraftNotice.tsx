"use client";
import Link from "next/link";
import { useState } from "react";
import type { CanvasDraft } from "@/lib/editor-drafts/canvas";
import { canvasDraftCopy } from "@/lib/editor-drafts/canvas-copy";
import { freeCopy } from "@/lib/free-editor/copy";
import { Canvas } from "./Canvas";

export function CanvasDraftNotice({ draft, locale, siteId, current, restorable, stale, exists, busy, restore, discard }: {
  draft: CanvasDraft; locale: string; siteId: string; current: boolean; restorable: boolean; stale: boolean; exists: boolean;
  busy: boolean; restore: () => void; discard: () => void;
}) {
  const c = canvasDraftCopy(locale), f = freeCopy(locale);
  const [inspect, setInspect] = useState(false);
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  return <section aria-label={`${c.found}: ${draft.doc.title}`} className="mx-auto my-4 max-w-3xl rounded-xl border border-line bg-panel p-4 text-sm">
    <h2 className="font-bold">{c.found}</h2>
    <p className="mt-2 break-words">{draft.doc.title}. {c.version}: {draft.baseVersion}. {c.elements}: {draft.doc.elements.length}.</p>
    <p className="mt-2">{restorable ? c.intro : stale ? c.stale : c.other}</p>
    <details className="mt-3" onToggle={event => setInspect(event.currentTarget.open)}><summary className="cursor-pointer underline">{c.inspect}</summary>
      <div className="my-3 flex gap-2"><button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>{f.desktop}</button><button type="button" aria-pressed={device === "phone"} onClick={() => setDevice("phone")}>{f.phone}</button></div>
      <div inert className="max-h-[500px] overflow-auto">{inspect && <Canvas doc={draft.doc} device={device} selected={null} onSelect={() => {}} onCommit={() => {}} preview={false} snap={false} viewportWidth={device === "phone" ? 360 : 1120} locale={locale} />}</div>
      {Object.entries(draft.links).map(([id, value]) => <label key={id} className="mt-2 block">{c.linkInput}: {draft.doc.elements.find(e => e.id === id)?.name}<textarea readOnly aria-label={c.linkInput} value={value} className="mt-1 w-full rounded border border-line bg-bg p-2" /></label>)}
    </details>
    <div className="mt-3 flex flex-wrap gap-2">
      {restorable && <button type="button" disabled={busy} onClick={restore} className="min-h-11 rounded-full bg-ink px-4 py-2 text-bg disabled:opacity-50">{c.restore}</button>}
      {!current && exists && !stale && !busy && <Link className="inline-flex min-h-11 items-center underline" href={`/sites/${siteId}/canvas${draft.sectionId ? `?section=${draft.sectionId}` : ""}`}>{c.open}</Link>}
      <a className="inline-flex min-h-11 items-center underline" download="windx-canvas-draft.json" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(draft, null, 2))}`}>{c.download}</a>
      <button type="button" disabled={busy} onClick={discard} className="min-h-11 rounded-full border border-line px-4 py-2 disabled:opacity-50">{c.discard}</button>
    </div>
    <p className="mt-2 text-xs text-muted">{c.note}</p>
  </section>;
}
