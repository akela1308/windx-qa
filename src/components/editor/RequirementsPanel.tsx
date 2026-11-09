"use client";
import { useDateFormatter } from "@/lib/i18n/use-date-formatter";
import { checkActionsCopy } from "@/lib/checks/actions-copy";
import { geographyStatus } from "@/lib/requirements/geography";
import { useState } from "react";
import { runRequirementsAction } from "@/app/requirements-actions";
import {
  requirementsCopy,
  requirementsFindingCopy,
  requirementsQuestionCopy,
} from "@/lib/requirements/copy";
import type {
  RequirementsCheckState,
  RequirementsFinding,
  RequirementsReport,
  RequirementsTarget,
} from "@/lib/requirements/types";
import type { RequirementsQuestion } from "@/lib/requirements/questions";
import { RequirementsQuestions } from "./RequirementsQuestions";
import type { EditorData } from "./Editor";

export function RequirementsPanel({
  data,
  onFacts,
  onCode,
  onFix,
}: {
  data: EditorData;
  onFacts: () => void;
  onCode: () => void;
  onFix: (text: string, section?: number) => void;
}) {
  const t = requirementsCopy(data.locale), a = checkActionsCopy(data.locale);
  // Локальный ответ действия виден сразу. Любое обновление серверного состояния
  // (в том числе из другого окна) заменяет его, а не скрывается локальным кешем.
  const [local, setLocal] = useState<{
    base: string;
    state: RequirementsCheckState;
  } | null>(null);
  const state =
    local?.base === data.requirements.key ? local.state : data.requirements;
  const [target, setTarget] = useState<RequirementsTarget>(
    data.published ? "published" : "draft",
  );
  const [chosen, setChosen] = useState<string>(),
    [questions, setQuestions] = useState(false),
    [questionStart, setQuestionStart] = useState<RequirementsQuestion>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const report =
    state.reports.find((r) => r.id === chosen) ??
    state.reports.find((r) => r.target === target);
  const stale =
    !!report &&
    report.fingerprint !==
      (report.target === "draft" ? state.draft : state.published);
  const update = (next: RequirementsCheckState) =>
    setLocal({ base: data.requirements.key, state: next });
  const date = useDateFormatter(data.locale, {dateStyle: "medium", timeStyle: "short"});
  const time = (at: string) => date.format(new Date(at));
  async function run() {
    if (!state.profile?.inputs.country?.trim() || state.profile.inputs.market === "unknown") { setQuestionStart(!state.profile?.inputs.country?.trim() ? "country" : "market"); setQuestions(true); return; }
    setBusy(true);
    setError("");
    try {
      const result = await runRequirementsAction(
        data.siteId,
        target,
        (target === "draft" ? state.draft : state.published) ?? "",
      );
      if (!result.ok) {
        if (result.state) update(result.state);
        setError(result.stale ? t.stale : result.limited ? t.rate : t.failed);
        return;
      }
      update(result.state);
      setChosen(result.report.id);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }
  function ask(f: RequirementsFinding) {
    const first = f.evidence.split(", ")[0] as RequirementsQuestion;
    const key: RequirementsQuestion =
      f.code === "identity" || f.code === "privacyFacts"
        ? first
        : f.code === "privacyMissing"
          ? state.profile?.inputs.legalName
            ? "purpose"
            : "legalName"
          : f.code === "retention"
            ? "retention"
            : f.code === "trackingInventory"
              ? "tracking"
              : f.code === "salesScope"
                ? "sales"
                : f.code === "specialScope"
                  ? "special"
                  : f.code === "entity"
                    ? "entity"
                    : "country";
    setQuestionStart(key);
    setQuestions(true);
  }
  const evidence = (f: RequirementsFinding) => {
    if (["identity", "placement", "privacyFacts"].includes(f.code))
      return f.evidence
        .split(", ")
        .map(
          (key) =>
            requirementsQuestionCopy(
              data.locale,
              key as RequirementsQuestion,
            )?.[0] ?? key,
        )
        .join("\n");
    if (["specialist", "consumerSales"].includes(f.code))
      return t[f.evidence as keyof typeof t] ?? f.evidence;
    return f.evidence;
  };
  function fix(r: RequirementsReport, f: RequirementsFinding) {
    const title = requirementsFindingCopy(data.locale, f.code)[0];
    const keys: RequirementsQuestion[] =
      f.code === "placement"
        ? ["legalName", "number", "office", "registeredIn"]
        : [
            "legalName",
            "purpose",
            "basis",
            "retention",
            "privacyContact",
            "sharing",
            "transfers",
          ];
    const facts = keys
      .filter((key) => r.inputs[key])
      .map(
        (key) =>
          `${requirementsQuestionCopy(data.locale, key)[0]} ${r.inputs[key]}`,
      )
      .join("; ");
    onFix(
      [`${a.context} ${r.version}.`, t.ask, title, evidence(f), `${t.profile}: ${facts}`]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " "),
      f.section,
    );
  }
  return (
    <div className="p-4 text-sm">
      <h2 className="font-display text-xl font-bold">{t.title}</h2>
      <p className="mt-3 leading-relaxed text-muted">{t.intro}</p>
      <details open={!report} className="mt-3 leading-relaxed text-muted">
        <summary className="cursor-pointer">{t.scopeTitle}</summary>
        <p className="mt-2">{t.scope}</p>
      </details>
      <div
        role="group"
        aria-label={t.version}
        className="mt-4 flex flex-wrap gap-2"
      >
        {(["draft", "published"] as const).map((value) => (
          <button
            key={value}
            disabled={
              busy || questions || (value === "published" && !data.published)
            }
            aria-pressed={target === value}
            onClick={() => {
              setTarget(value);
              setChosen(undefined);
            }}
            className={`rounded-full border border-line px-3 py-2 disabled:opacity-50 ${target === value ? "bg-bg font-medium" : ""}`}
          >
            {t[value]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={busy || questions || !!(data.guest && data.published)}
          onClick={run}
          className="rounded-full bg-ink px-4 py-2.5 font-medium text-bg disabled:opacity-50"
        >
          {busy ? t.working : report ? t.again : t.run}
        </button>
        <button
          disabled={busy}
          onClick={() => {
            setQuestionStart(undefined);
            setQuestions(!questions);
          }}
          className="rounded-full border border-line px-3 py-2 disabled:opacity-50"
        >
          {state.profile ? t.editAnswers : t.questions}
        </button>
      </div>
      {busy && (
        <p role="status" className="mt-3">
          {t.working}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-warn">
          {error}
        </p>
      )}
      <p className="mt-3 rounded-lg border border-line p-3 leading-relaxed" role="status">{geographyStatus(state.profile?.inputs, data.locale)}</p>
      <p className="mt-3 text-xs text-muted">
        {state.profile
          ? `${t.answers}: ${time(state.profile.at)}`
          : t.noAnswers}
      </p>
      {questions && (
        <RequirementsQuestions
          key={questionStart ?? "all"}
          initialQuestion={questionStart}
          siteId={data.siteId}
          locale={data.locale}
          state={state}
          onSaved={update}
          onClose={() => setQuestions(false)}
        />
      )}
      <div className="mt-5 space-y-2 border-y border-line py-3 text-xs leading-relaxed text-muted">
        <p>{t.noLegalApproval}</p>
        <p>{t.noCookieAudit}</p>
        <p>{t.reportsOnly}</p>
      </div>
      {!report && <p className="mt-4 leading-relaxed text-muted">{t.empty}</p>}
      {state.reports.length > 1 && (
        <details className="mt-4">
          <summary className="cursor-pointer">{t.history}</summary>
          <ul className="mt-2 space-y-2">
            {state.reports.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => {
                    setTarget(r.target);
                    setChosen(r.id);
                  }}
                  className="text-left underline underline-offset-4"
                >
                  {time(r.at)}, {t[r.target]}, {t.version} {r.version}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {report && (
        <section className="mt-5 border-t border-line pt-4">
          <p className="font-medium">
            {t[report.target]} · {t.version} {report.version}
          </p>
          <p className="mt-1 text-xs text-muted">{time(report.at)}</p>
          <p className="mt-2 text-xs text-muted">
            {t.source}: {t.document}, {t.platform.toLowerCase()},{" "}
            {t.profile.toLowerCase()}
          </p>
          {stale && (
            <p
              role="status"
              className="mt-3 rounded-xl border border-warn/50 p-3 text-warn"
            >
              {t.stale}
            </p>
          )}
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold">
              {t.map} · {report.flows.length}
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {t.mapNote}
            </p>
            <ul className="mt-3 divide-y divide-line">
              {report.flows.map((flow, i) => (
                <li key={i} className="py-3">
                  <p className="font-medium">
                    {t[flow.kind]}
                    {flow.section !== undefined
                      ? ` · ${t.section} ${flow.section + 1}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {t[flow.confidence]}
                  </p>
                  <p className="mt-2 leading-relaxed">
                    {t.fields}:{" "}
                    {flow.fields
                      .map((field) =>
                        field === "contact"
                          ? t.contactField
                          : field === "version"
                            ? t.versionField
                            : field === "unknown"
                              ? t.unknownField
                              : t[field as keyof typeof t],
                      )
                      .join(", ")}
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {t.destination}:{" "}
                    {flow.destination === "owner"
                      ? t.ownerDestination
                      : t[flow.destination]}
                  </p>
                  {flow.details && (
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted">
                      {flow.details}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {report.formSections.length > 0 && (
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {t.formNote}
              </p>
            )}
          </details>
          <h3 className="mt-5 font-semibold">
            {report.findings.length
              ? `${t.tasks}: ${report.findings.length}`
              : t.noFindings}
          </h3>
          <ol className="mt-2 divide-y divide-line">
            {report.findings.map((f, i) => {
              const [title, why, next] = requirementsFindingCopy(
                  data.locale,
                  f.code,
                ),
                source = report.sources.find((s) => s.key === f.reference);
              return (
                <li key={`${report.id}-${i}`} className="py-4">
                  <p className="text-xs text-muted">
                    {t[f.priority]} · {t[f.confidence]}
                  </p>
                  <h4 className="mt-1 font-semibold">{title}</h4>
                  <p className="mt-2 text-xs text-muted">
                    {f.section === undefined
                      ? t.page
                      : `${t.section} ${f.section + 1}`}{" "}
                    · {t[f.source]}
                  </p>
                  {f.evidence && (
                    <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-bg p-2 text-xs">
                      {t.evidence}: {evidence(f)}
                    </p>
                  )}
                  <p className="mt-3 leading-relaxed">
                    <b className="font-medium">{t.why}: </b>
                    {why}
                  </p>
                  <p className="mt-2 leading-relaxed">
                    <b className="font-medium">{t.fix}: </b>
                    {next}
                  </p>
                  <p className="mt-2 text-xs text-muted">{t[f.action]}</p>
                  {source && (
                    <p className="mt-2 text-xs text-muted">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        {t.reference}
                      </a>{" "}
                      · {t.checked}: {source.checkedAt}
                    </p>
                  )}
                  {!stale &&
                    !data.guest &&
                    (f.code === "facts" || f.code === "recipient" ? (
                      <button
                        onClick={onFacts}
                        className="mt-3 underline underline-offset-4"
                      >
                        {t.facts}
                      </button>
                    ) : f.code === "customCode" ? (
                      <button
                        onClick={onCode}
                        className="mt-3 underline underline-offset-4"
                      >
                        {t.openCode}
                      </button>
                    ) : f.action === "review" ? (
                      <button
                        disabled={!!data.pendingEdit}
                        onClick={() => { if (report.version !== data.currentVersion) { setTarget("draft"); setChosen(undefined); } else fix(report, f); }}
                        className="mt-3 underline underline-offset-4 disabled:opacity-50"
                      >
                        {t.discuss}
                      </button>
                    ) : f.action === "owner" ? (
                      <button
                        onClick={() => ask(f)}
                        className="mt-3 underline underline-offset-4"
                      >
                        {t.editAnswers}
                      </button>
                    ) : <details className="mt-3"><summary className="cursor-pointer underline">{a.review}</summary><p className="mt-2">{next}</p><p className="mt-2 text-xs text-muted">{t.noLegalApproval}</p></details>)}
                </li>
              );
            })}
          </ol>
          <details className="mt-4">
            <summary className="cursor-pointer">{t.privacyCandidates}</summary>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {t.candidateNote}
            </p>
            {report.privacySections.map((section) => (
              <p key={section} className="mt-2 text-xs">
                {t.section} {section + 1}
              </p>
            ))}
            {report.privacyLinks.map((link, i) => (
              <p key={i} className="mt-2 break-all text-xs">
                {t.section} {link.section + 1}: {link.href}
              </p>
            ))}
          </details>
          <details className="mt-4">
            <summary className="cursor-pointer">
              {t.profile} ·{" "}
              {report.profileAt ? time(report.profileAt) : t.noAnswers}
            </summary>
            <dl className="mt-3 space-y-3 text-xs leading-relaxed">
              {Object.entries(report.inputs).map(([key, value]) => (
                <div key={key}>
                  <dt className="font-medium">
                    {
                      requirementsQuestionCopy(
                        data.locale,
                        key as RequirementsQuestion,
                      )[0]
                    }
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-muted">
                    {value ? (t[value as keyof typeof t] ?? value) : t.unknown}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
          <details className="mt-4">
            <summary className="cursor-pointer">{t.sources}</summary>
            <p className="mt-2 text-xs text-muted">{report.rulesVersion}</p>
            <ul className="mt-2 space-y-2 text-xs">
              {report.sources.map((source) => (
                <li key={source.key}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4"
                  >
                    {source.title}
                  </a>{" "}
                  · {source.checkedAt}
                </li>
              ))}
            </ul>
          </details>
          {report.limited && <p className="mt-3 text-warn">{t.truncated}</p>}
          {report.sourcesDue && (
            <p className="mt-3 text-warn">{t.sourcesDue}</p>
          )}
          <p className="mt-5 border-t border-line pt-4 leading-relaxed text-muted">
            {t.limits}
          </p>
        </section>
      )}
    </div>
  );
}
