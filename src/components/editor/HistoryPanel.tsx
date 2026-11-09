"use client";
import { useDateFormatter } from "@/lib/i18n/use-date-formatter";

import { contentCopy } from "@/lib/content/copy";
import { freeCopy } from "@/lib/free-editor/copy";
import { useTransition } from "react";
import { revertAction } from "@/app/actions";
import { fmt } from "@/lib/i18n/format";
import type { EditorData, EditorT } from "./Editor";

// Британский формат дат для английского интерфейса (продукт для Лондона).
export const dateLocale = (locale: string) => (locale === "en" ? "en-GB" : locale);

// История версий. Возврат создаёт новую версию, старые не пропадают.
export function HistoryPanel({ data, t }: { data: EditorData; t: EditorT }) {
  const [pending, start] = useTransition();
  const date = useDateFormatter(data.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const label = { create: t.actionCreate, edit: t.actionEdit, revert: t.actionRevert, code: t.code.history, manual: contentCopy(data.locale).history, form: t.enquiries.history, canvas:freeCopy(data.locale).history };
  return (
    <ol className="p-2">
      {[...data.versions].reverse().map((v) => {
        const current = v.n === data.currentVersion;
        return (
          <li key={v.n} className={`flex items-start justify-between gap-3 rounded-xl p-3 text-sm ${current ? "bg-bg" : ""}`}>
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                {fmt(t.version, { n: v.n })}
                {current && <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-on-brand ring-1 ring-ink">{t.current}</span>}
              </p>
              <p className="text-muted">
                {label[v.action]}, {date.format(new Date(v.createdAt))}
              </p>
              {v.action !== "revert" && <p className="mt-1 line-clamp-2 text-muted">{v.request}</p>}
            </div>
            {!current && (
              <button
                disabled={pending}
                onClick={() => start(() => revertAction(data.siteId, v.n))}
                className="shrink-0 rounded-full border border-line px-3 py-1 text-xs transition-colors hover:border-ink disabled:opacity-50"
              >
                {t.restore}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
