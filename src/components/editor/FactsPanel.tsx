"use client";

import { useTransition } from "react";
import { factAction, factsBulkAction } from "@/app/actions";
import { fmt } from "@/lib/i18n/format";
import type { EditorData, EditorT, FactInfo } from "./Editor";
import { EnquiryRecipient } from "./EnquiryRecipient";

// Придуманные AI сведения (телефон, цены, часы, отзывы). Владелец отмечает, что верно.
// Сгруппированы по месту на сайте человеческими словами, а не путями вроде «services.index».

type Place = keyof EditorT["places"];
const PLACES = new Set<string>(["header", "hero", "services", "story", "proof", "process", "faq", "gallery", "media", "contact", "signature", "embed", "free", "footer", "meta"]);

// «services.index, Full service» → место «services» и уточнение «Full service».
export function placeOf(where: string): { place: Place; detail: string } {
  const key = (where.match(/^[a-z]+/i)?.[0] ?? "").toLowerCase();
  const place = (PLACES.has(key) ? key : "other") as Place;
  const detail = PLACES.has(key) ? where.replace(/^[a-z]+(\.[a-z-]+)?[\s,:;-]*/i, "").replace(/^(facts?|props?)\b\s*/i, "") : where;
  return { place, detail };
}

export function FactsPanel({ data, t, onEdit }: { data: EditorData; t: EditorT; onEdit?: (section?: number) => void }) {
  const [pending, start] = useTransition();
  if (data.facts.length === 0) return <>{data.enquiries.enabled && <EnquiryRecipient data={data} t={t} />}<p className="p-4 text-sm text-muted">{t.noFacts}</p></>;

  const groups = new Map<Place, (FactInfo & { detail: string })[]>();
  for (const f of data.facts) {
    const { place, detail } = placeOf(f.where);
    groups.set(place, [...(groups.get(place) ?? []), { ...f, detail }]);
  }
  const done = data.facts.filter((f) => f.status !== "unconfirmed").length;

  return (
    <div className="text-sm">
      {data.enquiries.enabled && <EnquiryRecipient data={data} t={t} />}
      <div className="border-b border-line p-4">
        <p className="text-muted">{t.factsIntro}</p>
        <p className="mt-2 font-medium" aria-live="polite">{fmt(t.factsProgress, { done, total: data.facts.length })}</p>
      </div>
      {[...groups].map(([place, facts]) => {
        const open = facts.filter((f) => f.status === "unconfirmed").map((f) => f.fact);
        return (
          <section key={place} className="border-b border-line p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-sm font-bold tracking-tight">{t.places[place]}</h3>
              {open.length > 1 && (
                <button disabled={pending} onClick={() => start(() => factsBulkAction(data.siteId, open, "confirmed"))} className="rounded-full border border-line px-3 py-1 text-xs transition-colors hover:border-ink disabled:opacity-50">
                  {t.groupAll}
                </button>
              )}
            </div>
            <ul className="mt-3 space-y-3">
              {facts.map((f) => (
                <li key={f.fact} className="rounded-xl bg-bg p-3">
                  <p>{f.fact}</p>
                  {f.detail && <p className="mt-0.5 text-xs text-muted">{f.detail}</p>}
                  {onEdit && <button className="mt-2 underline underline-offset-4" onClick={() => onEdit(data.sections.find(s => s.composition.split(".")[0] === place)?.index)}>{data.locale === "ru" ? "Исправить на сайте" : data.locale === "es" ? "Corregir en el sitio" : "Edit on the site"}</button>}
                  <div className="mt-2 flex items-center gap-2">
                    {f.status === "unconfirmed" ? (
                      <>
                        <button disabled={pending} onClick={() => start(() => factAction(data.siteId, f.fact, "confirmed"))} className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-bg disabled:opacity-50">
                          {t.correct}
                        </button>
                        <button disabled={pending} onClick={() => start(() => factAction(data.siteId, f.fact, "wrong"))} className="rounded-full border border-line px-3 py-1 text-xs hover:border-warn disabled:opacity-50">
                          {t.wrong}
                        </button>
                      </>
                    ) : (
                      <button disabled={pending} onClick={() => start(() => factAction(data.siteId, f.fact, "unconfirmed"))} className={`text-xs underline underline-offset-2 ${f.status === "wrong" ? "text-warn" : "text-ink"}`}>
                        {f.status === "wrong" ? t.statusWrong : t.statusConfirmed}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
