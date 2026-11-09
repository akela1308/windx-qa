"use client";

import {domainCopy} from "@/lib/domains/copy";
import { useState, useTransition } from "react";
import { publishAction, unpublishAction, type PublishState } from "@/app/actions";
import { fmt } from "@/lib/i18n/format";
import type { EditorData, EditorT } from "./Editor";
import { requirementsCopy } from "@/lib/requirements/copy";
import { searchCopy } from "@/lib/search/copy";
import { worksCopy } from "@/lib/checks/copy";
import Link from "next/link";

// Панель «Опубликовать»: адрес сайта, проверка фактов, публикация и снятие с публикации.
// Публикация закрыта, пока придуманные AI сведения не подтверждены (требование из мастер-контекста).
export function PublishPanel({ data, t, openFacts, showFacts, showDomain }: { data: EditorData; t: EditorT; openFacts: number; showFacts: () => void; showDomain: () => void }) {
  const p = t.publishing;
  const rc = requirementsCopy(data.locale), requirements = data.requirements.reports.find(r => r.target === "draft");
  const sc = searchCopy(data.locale), search = data.search.reports.find(r => r.target === "draft");
  const wc = worksCopy(data.locale), report = data.works.reports[0];
  const [pending, start] = useTransition();
  const [state, setState] = useState<PublishState>({ status: "idle" });
  const [copied, setCopied] = useState(false);
  const wrong = data.facts.filter((f) => f.status === "wrong").length;
  const recipientMissing = data.enquiries.enabled && !data.enquiries.confirmed;
  const blocked = openFacts > 0 || wrong > 0 || recipientMissing;
  const live = data.published;
  const host = data.liveUrl.replace(/^https?:\/\//, "");

  const publish = () => start(async () => setState(await publishAction(data.siteId)));
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <>
      <h2 className="font-display text-base font-bold tracking-tight">{p.title}</h2>
      <p className="mt-3 text-xs text-muted">{live ? p.liveAt : p.willBe}</p>
      <div className="mt-1 flex items-center gap-2">
        {live && <span className="size-2 shrink-0 rounded-full bg-brand ring-1 ring-ink" aria-hidden="true" />}
        <span className="min-w-0 flex-1 truncate font-mono text-sm">{host}</span>
        {live && (
          <>
            <button onClick={copy} className="text-xs text-muted underline underline-offset-2 hover:text-ink">{copied ? p.copied : p.copy}</button>
            <a href={data.liveUrl} target="_blank" rel="noopener" className="text-xs text-muted underline underline-offset-2 hover:text-ink">{p.open}</a>
          </>
        )}
      </div>

      {live && (
        <p className="mt-3 text-sm text-muted">
          {live.version === data.currentVersion ? p.upToDate : fmt(p.outdated, { live: live.version, cur: data.currentVersion })}
        </p>
      )}

      <div className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted"><p className="font-medium">{wc.summary}</p><p>{!report ? wc.unavailable : report.fingerprint !== data.works.fingerprint ? wc.stale : `${!report.browser ? wc.partial + ". " : ""}${wc.version} ${report.version}: ${report.findings.length} ${wc.tasks.toLowerCase()}`}</p><p className="mt-1">{wc.reportOnly}</p></div>

      <div className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted"><p className="font-medium">{sc.summary}</p><p>{!search ? sc.unavailable : search.fingerprint !== data.search.draft ? sc.stale : `${!search.browser ? sc.partial + ". " : ""}${sc.version} ${search.version}: ${search.findings.length} ${sc.tasks.toLowerCase()}`}</p><p className="mt-1">{sc.readiness}</p></div>

      <div className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted"><p className="font-medium">{rc.summary}</p><p>{!requirements ? rc.notRun : requirements.fingerprint !== data.requirements.draft ? rc.stale : `${rc.version} ${requirements.version}: ${requirements.findings.length} ${rc.tasks.toLowerCase()}`}</p><p className="mt-1">{rc.noLegalApproval}</p></div>

      {blocked ? (
        <div className="mt-4 rounded-xl bg-bg p-3 text-sm">
          {recipientMissing && <p className="mb-2">{t.enquiries.missing}</p>}
          {openFacts > 0 && <p>{fmt(p.factsBlock, { n: openFacts })}</p>}
          {wrong > 0 && <p className={openFacts > 0 ? "mt-2" : ""}>{fmt(p.wrongBlock, { n: wrong })}</p>}
          {(openFacts > 0 || recipientMissing) && (
            <button onClick={showFacts} className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg">
              {t.reviewFacts}
            </button>
          )}
        </div>
      ) : (
        (!live || live.version !== data.currentVersion) && (
          <button
            onClick={publish}
            disabled={pending}
            className="mt-4 w-full rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-on-brand ring-1 ring-ink transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? p.working : live ? p.update : p.publish}
          </button>
        )
      )}
      {state.status === "error" && <p role="alert" className="mt-3 text-sm text-warn">{t.failed}</p>}

      {live && !data.guest && (
        <button onClick={() => start(() => unpublishAction(data.siteId))} disabled={pending} className="mt-3 text-sm text-warn underline underline-offset-2">
          {p.unpublish}
        </button>
      )}
      {live && data.guest && <Link href={`/login?mode=register&next=${encodeURIComponent(`/sites/${data.siteId}`)}`} className="mt-4 block text-sm font-medium underline underline-offset-4">{t.trial.register}</Link>}
      {!data.guest && <button className="mt-4 block text-sm underline underline-offset-4" onClick={showDomain}>{domainCopy(data.locale).title}</button>}
      {data.domain.connection?.status === "active" && <p className="mt-2 break-all text-xs">{data.domain.connection.host}</p>}
      <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">
        {p.noBadge}
      </p>
    </>
  );
}
