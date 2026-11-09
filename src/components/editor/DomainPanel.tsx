"use client";
import { useDateFormatter } from "@/lib/i18n/use-date-formatter";
import { useState, useTransition } from "react";
import { domainAction } from "@/app/domain-actions";
import { domainCopy } from "@/lib/domains/copy";
import type {
  DomainClientState,
  DomainDnsRecord,
  DomainIssue,
} from "@/lib/domains/types";
import type { EditorData } from "./Editor";
export function DomainPanel({ data }: { data: EditorData }) {
  const t = domainCopy(data.locale),
    [local, setLocal] = useState<DomainClientState | null>(null),
    [host, setHost] = useState(""),
    [issue, setIssue] = useState<DomainIssue>("none"),
    [confirm, setConfirm] = useState(false),
    [pending, start] = useTransition();
  const date = useDateFormatter(data.locale, {dateStyle: "medium", timeStyle: "short"});
  const state = local ?? data.domain,
    c = state.connection;
  const act = (action: "create" | "check" | "disconnect") =>
    start(async () => {
      setIssue("none");
      try {
        const result = await domainAction(
          data.siteId,
          action,
          c?.id ?? null,
          host,
        );
        if (result.ok) {
          setLocal(result.state);
          setConfirm(false);
        } else setIssue(result.issue);
      } catch {
        setIssue("platform");
      }
    });
  const button =
    "rounded-full border border-ink px-4 py-2 text-sm disabled:opacity-50";
  return (
    <section
      className="space-y-4 p-4 text-sm leading-relaxed"
      aria-busy={pending}
    >
      <h2 className="font-display text-xl font-bold">{t.title}</h2>
      <p>{t.intro}</p>
      <p className="break-all text-xs text-muted">{data.liveUrl}</p>
      {!state.configured && (
        <p role="status" className="rounded-xl border border-line p-3">
          {t.platform}
        </p>
      )}
      {!state.published && <p className="text-muted">{t.offline}</p>}
      {!c || c.status === "disconnected" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act("create");
          }}
          className="space-y-3"
        >
          <label htmlFor="domain-host" className="block font-medium">
            {t.host}
          </label>
          <input
            id="domain-host"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            maxLength={253}
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder={t.placeholder}
            className="w-full min-w-0 rounded-xl border border-line bg-bg px-3 py-2"
          />
          <button
            disabled={pending}
            className={`${button} bg-brand text-on-brand`}
          >
            {t.add}
          </button>
        </form>
      ) : (
        <>
          <p className="break-all font-mono font-medium">{c.host}</p>
          <p role="status" className="font-medium">
            {t.status[c.status]}
          </p>
          {c.issue !== "none" && (
            <p className="text-warn">{t.issue[c.issue]}</p>
          )}
          {c.checkedAt && (
            <p className="text-xs text-muted">
              {t.checked}: {date.format(new Date(c.checkedAt))}
            </p>
          )}
          {c.status !== "removing" && (
            <>
              <h3 className="font-semibold">{t.proof}</h3>
              <p>{t.proofHelp}</p>
              <Record record={c.ownershipRecord} locale={data.locale} />
              {c.records.length > 0 && (
                <>
                  <h3 className="font-semibold">{t.route}</h3>
                  <p>{t.routeHelp}</p>
                  {c.records.map((record, i) => (
                    <Record
                      key={`${record.type}-${i}`}
                      record={record}
                      locale={data.locale}
                    />
                  ))}
                </>
              )}
              <p className="text-xs text-muted">{t.exact}</p>
              <p className="text-xs text-muted">{t.waiting}</p>
              <button
                disabled={pending}
                className={`${button} bg-brand text-on-brand`}
                onClick={() => act("check")}
              >
                {pending ? t.working : t.check}
              </button>
              {c.status === "active" && state.published && (
                <a
                  className="ml-3 underline underline-offset-4"
                  href={`https://${c.host}`}
                  target="_blank"
                  rel="noopener"
                >
                  {t.open}
                </a>
              )}
            </>
          )}
          {confirm ? (
            <div className="space-y-3 border-t border-line pt-3">
              <p>{t.confirm}</p>
              <button
                disabled={pending}
                className={`${button} text-warn`}
                onClick={() => act("disconnect")}
              >
                {t.yes}
              </button>
              <button
                className="ml-3 underline"
                onClick={() => setConfirm(false)}
              >
                {t.cancel}
              </button>
            </div>
          ) : (
            <button
              disabled={pending}
              className="block text-warn underline underline-offset-4"
              onClick={() => setConfirm(true)}
            >
              {t.disconnect}
            </button>
          )}
        </>
      )}
      {issue !== "none" && (
        <p role="alert" className="text-warn">
          {t.issue[issue]}
        </p>
      )}
      <p className="border-t border-line pt-3 text-xs text-muted">{t.scope}</p>
    </section>
  );
}
function Record({
  record,
  locale,
}: {
  record: DomainDnsRecord;
  locale: string;
}) {
  const t = domainCopy(locale),
    [copied, setCopied] = useState("");
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
    } catch {
      setCopied("");
    }
  };
  return (
    <dl className="space-y-2 rounded-xl border border-line bg-bg p-3 text-xs">
      <div>
        <dt className="text-muted">{t.type}</dt>
        <dd className="font-mono">{record.type}</dd>
      </div>
      {[
        [t.name, record.name],
        [t.value, record.value],
      ].map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted">{label}</dt>
          <dd className="break-all font-mono select-all">{value}</dd>
          <button
            className="mt-1 underline underline-offset-2"
            onClick={() => copy(value)}
            aria-label={`${t.copy}: ${label}`}
          >
            {copied === value ? t.copied : t.copy}
          </button>
        </div>
      ))}
    </dl>
  );
}
