"use client";

import { useActionState, useState } from "react";
import { editSiteAction, type EditState } from "@/app/actions";
import { fmt } from "@/lib/i18n/format";
import { SECTION_PREFIX } from "@/lib/ai/stub-fixtures";
import type { EditorData, EditorT, Picked, VersionInfo } from "./Editor";
import { placeOf } from "./FactsPanel";
import { EditReview } from "./EditReview";
import { AiEstimateReview, AiUsage } from "@/components/AiEstimateReview";
import { aiEstimateCopy } from "@/lib/ai/estimate-copy";
import { freeCopy } from "@/lib/free-editor/copy";

// Чат правок. История чата строится из версий: каждая просьба создала версию.
// Подсказки над полем открывают оценку выбранной просьбы до запуска AI.
// Если на превью выбран блок, над полем видно, какой именно, и просьба уходит только про него.
export function ChatPanel({ data, t, picked, clearPicked, draftRequest }: { draftRequest?: string; data: EditorData; t: EditorT; picked: Picked | null; clearPicked: () => void }) {
  const [state, action, pending] = useActionState(editSiteAction.bind(null, data.siteId), (data.pendingEdit ?? { status: "idle" }) as EditState);
  const reviewing = state.status === "review";
  const quoting=state.status==="estimate";
  const [text,setText]=useState(draftRequest??"");
  return (
    <div className="flex h-full flex-col">
      <ol className="flex flex-1 flex-col gap-4 p-4" aria-live="polite">
        {data.versions.map((v) => (
          <li key={v.n} className="flex flex-col gap-2">
            {v.action !== "revert" && <Bubble who={t.you}>{requestText(v.request, t)}</Bubble>}
            <Bubble who={v.action === "canvas" ? freeCopy(data.locale).history : v.action === "code" ? t.code.history : v.action === "form" ? t.enquiries.history : t.ai} ai={!["code","form","canvas"].includes(v.action)} demo={v.demo ? t.demoBadge : undefined}>
              {aiText(v, t)}
            </Bubble>
            {v.aiUsage&&<AiUsage receipt={v.aiUsage} locale={data.locale}/>}
          </li>
        ))}
        {state.status === "unsupported" && !pending && <li className="rounded-xl border border-warn/40 bg-bg p-3 text-sm text-warn">{state.message ?? t.unsupported}</li>}
        {state.status === "error" && !pending && <li role="alert" className="rounded-xl border border-warn/40 bg-bg p-3 text-sm text-warn">{state.message ?? t.failed}</li>}
        {state.status === "review" && <EditReview state={state} siteId={data.siteId} currentVersion={data.currentVersion} t={t} action={action} pending={pending} />}
        {state.receipt&&<li><AiUsage receipt={state.receipt} locale={data.locale}/></li>}
        {state.status==="estimate"&&<li><form action={action}><p className="whitespace-pre-wrap text-sm">{state.section!==undefined?`${blockLabel(state.section,state.composition??"",t)}: `:""}{state.asked}</p><input type="hidden" name="request" value={state.asked}/>{state.section!==undefined&&<><input type="hidden" name="section" value={state.section}/><input type="hidden" name="composition" value={state.composition}/></>}<AiEstimateReview estimate={state.estimate} locale={data.locale} pending={pending} message={state.message} onCancel={()=>setText(state.asked)} onConfirm={()=>setText(state.asked)}/></form></li>}
      </ol>
      <form action={action} className="sticky bottom-0 border-t border-line bg-panel p-3">
        {picked && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-brand/15 px-3 py-2 text-sm ring-1 ring-brand-deep/40">
            <span aria-hidden="true" className="inline-block size-3 rounded-[3px] border-2 border-dashed border-brand-deep" />
            <span className="min-w-0 flex-1 truncate">{blockLabel(picked.index, picked.composition, t)}</span>
            <button type="button" disabled={pending||quoting} onClick={clearPicked} className="text-xs text-muted underline underline-offset-2 hover:text-ink">{t.tools.clear}</button>
            <input type="hidden" name="section" value={picked.index} />
            <input type="hidden" name="composition" value={picked.composition} />
          </div>
        )}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {t.suggestions.map((s) => (
            <button key={s} type="submit" name="suggestion" value={s} disabled={pending || reviewing || quoting} className="rounded-full border border-line px-3 py-1 text-xs transition-colors hover:border-ink disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            name="request"
            value={text}
            onChange={e=>setText(e.target.value)}
            placeholder={t.placeholder}
            aria-label={t.placeholder}
            disabled={pending || reviewing || quoting}
            className="min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-ink"
          />
          <button disabled={pending || reviewing || quoting} className="shrink-0 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-bg transition-transform active:scale-[0.98] disabled:opacity-60">
            {pending ? quoting?t.working:aiEstimateCopy(data.locale).checking : t.send}
          </button>
        </div>
      </form>
    </div>
  );
}

// «Блок 3, Первый экран» по номеру раздела и его композиции.
function blockLabel(index: number, composition: string, t: EditorT): string {
  return fmt(t.tools.changing, { n: index + 1, place: t.places[placeOf(composition).place] });
}

// Просьба про выбранный блок хранится с технической приставкой для модели; владельцу показываем по-человечески.
function requestText(request: string, t: EditorT): string {
  const m = request.match(SECTION_PREFIX);
  return m ? `${blockLabel(Number(m[1]), m[2], t)}\n${request.slice(m[0].length)}` : request;
}

function aiText(v: VersionInfo, t: EditorT): string {
  if (v.action === "revert") return fmt(t.restored, { n: v.request });
  if (v.action === "create") return v.reply ? `${t.created} ${v.reply}` : t.created;
  return v.reply || fmt(t.edited, { n: v.n });
}

// Длинные ответы AI сворачиваем до нескольких строк, чтобы не было стены текста.
function Bubble({ who, ai = false, demo, children }: { who: string; ai?: boolean; demo?: string; children: string }) {
  const [open, setOpen] = useState(false);
  const long = children.length > 220;
  return (
    <div className={`max-w-[92%] rounded-2xl p-3 text-sm leading-relaxed ${ai ? "self-start bg-bg" : "self-end border border-line"}`}>
      <p className="mb-1 flex items-center gap-2 text-xs text-muted">
        {ai && <span className="inline-block size-2 rounded-[2px] bg-brand ring-1 ring-ink" aria-hidden="true" />}
        {who}
        {demo && <span className="rounded-full border border-line px-1.5">{demo}</span>}
      </p>
      <p className={`whitespace-pre-line ${long && !open ? "line-clamp-4" : ""}`}>{children}</p>
      {long && (
        <button onClick={() => setOpen(!open)} className="mt-1 text-xs text-muted underline underline-offset-2 hover:text-ink">
          {open ? "−" : "+"}
        </button>
      )}
    </div>
  );
}
