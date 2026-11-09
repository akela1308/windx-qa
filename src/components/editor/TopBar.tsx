"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { renameAction } from "@/app/actions";
import { fmt } from "@/lib/i18n/format";
import type { Device, EditorData, EditorT } from "./Editor";
import { requirementsCopy } from "@/lib/requirements/copy";
import { searchCopy } from "@/lib/search/copy";
import { worksCopy } from "@/lib/checks/copy";
import { PublishPanel } from "./PublishPanel";

type Panel = "publish" | "checks" | null;

// Рабочая рамка редактора: назад к сайтам, название, статус версии,
// вид компьютер/телефон, проверки и публикация.
export function TopBar({ data, t, device, setDevice, openFacts, showFacts, showWorks, showSearch, showRequirements, showDomain, onLeave }: {
  onLeave: () => boolean; data: EditorData; t: EditorT; device: Device; setDevice: (d: Device) => void; openFacts: number; showFacts: () => void; showWorks: () => void; showSearch: () => void; showRequirements: () => void; showDomain: () => void;
}) {
  const rc = requirementsCopy(data.locale), requirements = data.requirements.reports[0];
  const wc = worksCopy(data.locale);
  const latest = data.works.reports[0];
  const sc = searchCopy(data.locale), search = data.search.reports[0];
  const [panel, setPanel] = useState<Panel>(null);
  const [name, setName] = useState(data.name);
  const [pending, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const saveName = () => {
    if (name.trim() && name.trim() !== data.name) start(() => renameAction(data.siteId, name));
  };

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg px-3 md:px-4">
      <Link href="/sites" onNavigate={event => { if (!onLeave()) event.preventDefault(); }} className="flex shrink-0 items-center gap-2 rounded-full px-2 py-1.5 text-sm text-muted transition-colors hover:text-ink" aria-label={t.back}>
        <span className="inline-block size-3 rounded-[3px] bg-brand ring-1 ring-ink" aria-hidden="true" />
        <span className="hidden sm:inline">{t.back}</span>
      </Link>
      <span className="text-line" aria-hidden="true">/</span>
      {data.guest ? <span className="min-w-0 flex-1 truncate text-sm font-semibold">{data.name}</span> : <input
        aria-label={t.rename}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={saveName}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        className="min-w-0 max-w-[16rem] flex-1 truncate rounded-lg bg-transparent px-2 py-1 font-display text-sm font-bold tracking-tight outline-none hover:bg-panel focus:bg-panel focus:ring-1 focus:ring-ink sm:flex-none"
      />}
      <span className="hidden shrink-0 text-xs text-muted md:inline" aria-live="polite">
        {pending ? "…" : fmt(t.viewing, { n: data.currentVersion })}
      </span>

      <div className="mx-auto hidden rounded-full border border-line p-0.5 lg:flex" role="group">
        {(["desktop", "phone"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDevice(d)}
            aria-pressed={device === d}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${device === d ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
          >
            {t[d]}
          </button>
        ))}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
        <button
          onClick={() => setPanel(panel === "checks" ? null : "checks")}
          aria-expanded={panel === "checks"}
          className={`flex items-center gap-2 rounded-full border border-ink px-3 py-1.5 text-xs font-medium shadow-[2px_2px_0_var(--shadow)] transition-colors hover:bg-ink hover:text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:text-sm ${panel === "checks" ? "bg-ink text-bg" : "bg-panel text-ink"}`}
        >
          {t.checksPill}<span aria-hidden="true" className={`transition-transform ${panel === "checks" ? "rotate-180" : ""}`}>⌄</span>
        </button>
        <button
          onClick={() => setPanel(panel === "publish" ? null : "publish")}
          aria-expanded={panel === "publish"}
          className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-on-brand ring-1 ring-ink transition-transform active:scale-[0.98]"
        >
          {data.published && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-on-brand align-middle" aria-hidden="true" />}
          {data.published ? t.publishing.live : t.publish}
        </button>
      </div>

      {panel && (
        <>
          <button className="fixed inset-0 cursor-default" aria-label={t.close} onClick={() => setPanel(null)} />
          <div role="dialog" aria-label={panel === "publish" ? t.publishing.title : t.checksPill} className="absolute right-3 top-14 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-ink bg-panel p-5 shadow-[6px_6px_0_0_var(--shadow)]">
            {panel === "publish" ? (
              <PublishPanel showDomain={() => {showDomain();setPanel(null);}} data={data} t={t} openFacts={openFacts} showFacts={() => { showFacts(); setPanel(null); }} />
            ) : (
              <>
                <h2 className="font-display text-base font-bold tracking-tight">{t.checksPill}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t.checksText}</p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {[t.checkSearch, t.checkWorks, t.checkRules].map((c) => (
                    <li key={c} className="flex items-center justify-between gap-3">
                      {c === t.checkSearch ? <button disabled={!!(data.guest && data.published)} onClick={() => { showSearch(); setPanel(null); }} className="text-left underline underline-offset-4 disabled:opacity-50">{c}</button> : c === t.checkWorks ? <button disabled={!!(data.guest && data.published)} onClick={() => { showWorks(); setPanel(null); }} className="text-left underline underline-offset-4 disabled:opacity-50">{c}</button> : <button disabled={!!(data.guest && data.published)} onClick={() => { showRequirements(); setPanel(null); }} className="text-left underline underline-offset-4 disabled:opacity-50">{c}</button>}
                      <span className="text-xs text-muted">{c === t.checkSearch ? search ? search.fingerprint === (search.target === "published" ? data.search.published : data.search.draft) ? (!search.browser || search.unavailable) ? sc.partial : String(search.findings.length) : "↻" : sc.run : c === t.checkWorks ? latest ? latest.fingerprint === data.works.fingerprint ? latest.browser ? String(latest.findings.length) : wc.partial : "↻" : wc.run : requirements ? requirements.fingerprint === (requirements.target === "published" ? data.requirements.published : data.requirements.draft) ? String(requirements.findings.length) : "↻" : rc.run}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}
    </header>
  );
}
