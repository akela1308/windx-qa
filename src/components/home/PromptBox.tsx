"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createSiteAction, type CreateState } from "@/app/actions";
import type { Dict } from "@/lib/i18n/en";
import { VoiceInput } from "./VoiceInput";
import { BuildScreen } from "./BuildScreen";
import { AiEstimateReview, AiUsage } from "@/components/AiEstimateReview";

// Главное действие продукта: описание бизнеса одним полем, без анкеты.
// Примеры подставляются в поле по клику, стиль приходит из витрины (?style=).
export function PromptBox({ t, locale, style, styleName, initialBrief, template }: { t: Dict["home"] & { clarifyWhat: string; clarifyWhy: string; submitHint: string }; locale:string; style?: string; styleName?: string; initialBrief?: string; template?: number }) {
  const [state, action, pending] = useActionState(createSiteAction, { clarify: false, brief: "" } as CreateState);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const quoting=!!state.estimate;
  const [brief, setBrief] = useState(state.brief || initialBrief || "");
  // Пример заменяет текст в поле; прежний текст можно вернуть.
  const [previous, setPrevious] = useState<string | null>(null);
  const applyExample = (text: string) => {
    if (brief.trim() && brief !== text) setPrevious(brief);
    setBrief(text);
  };

  return (
    <form action={action} onSubmit={(event) => { if (voiceBusy) event.preventDefault(); }} id="create" className="scroll-mt-24">

      {template !== undefined && <input type="hidden" name="template" value={template} />}
      {quoting&&<input type="hidden" name="brief" value={state.brief}/>}
      <label htmlFor="brief" className="mb-2 block text-sm font-medium">{t.label}</label>
      <div className="rounded-2xl border border-ink bg-panel p-2 shadow-[6px_6px_0_0_var(--shadow)] transition-shadow focus-within:shadow-[8px_8px_0_0_var(--shadow)]">
        <textarea
          id="brief"
          name={quoting?undefined:"brief"}
          readOnly={voiceBusy || pending || quoting}
          value={quoting?state.brief:brief}
          onChange={(e) => setBrief(e.target.value)}
          // Ctrl или Cmd + Enter отправляет, как в Lovable; обычный Enter переносит строку.
          onKeyDown={(e) => {
            if (!voiceBusy && !pending && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={4}
          required
          placeholder={t.placeholder}
          className="block max-h-[45vh] min-h-[7.5rem] w-full resize-none rounded-xl bg-transparent p-3 text-base leading-relaxed text-ink outline-none [field-sizing:content] placeholder:text-muted"
        />
        <VoiceInput t={t.voice} value={brief} onChange={setBrief} onBusy={setVoiceBusy} disabled={pending||quoting} />
        {state.clarify && (
          // Один уточняющий вопрос с объяснением, зачем он нужен.
          <div className="mx-1 mb-2 rounded-xl bg-bg p-3">
            <label htmlFor="answer" className="block text-sm font-medium">{t.clarifyWhat}</label>
            <p className="mt-1 text-sm text-muted">{t.clarifyWhy}</p>
            <input id="answer" name="answer" required autoFocus className="mt-2 w-full rounded-xl border border-line bg-panel px-3 py-2 outline-none focus:border-ink" />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-1">
          <p className="text-sm text-muted">
            {t.style}:{" "}
            {style ? (
              <>
                <Link href={`/examples/${style}`} className="font-medium text-ink underline underline-offset-4">{styleName} ↗</Link>{" "}
                <Link href="/" className="underline underline-offset-2 hover:text-ink">{t.clearStyle}</Link>
              </>
            ) : (
              <Link href="/templates#looks" className="underline underline-offset-2 hover:text-ink">{t.anyStyle}</Link>
            )}
          </p>
          {style && <input type="hidden" name="style" value={style} />}
          <span className="ml-auto hidden text-xs text-muted md:inline">{t.submitHint}</span>
          {!quoting&&<button
            disabled={pending || voiceBusy}
            className="rounded-full bg-brand px-6 py-3 font-medium text-on-brand ring-1 ring-ink transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? t.building.title : t.submit}
          </button>}
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">{locale === "ru" ? "Пробное создание бесплатно. Публикация — отдельный шаг." : locale === "es" ? "La creación de prueba es gratis. Publicar es un paso aparte." : "Trial creation is free. Publishing is a separate step."}</p>
      {pending && <BuildScreen t={t.building} styleName={styleName} />}
      {state.estimate&&<AiEstimateReview estimate={state.estimate} locale={locale} pending={pending} message={state.message} onCancel={()=>setBrief(state.brief)} onConfirm={()=>setBrief(state.brief)}/>}
      {!quoting&&state.receipt&&<AiUsage receipt={state.receipt} locale={locale}/>}
      {state.error && !pending && (
        <div role="alert" className="mt-4 rounded-xl border border-warn/40 bg-panel p-3 text-sm text-warn"><p>{state.message ?? t.failed}</p>{state.needsAccount && <Link href="/login?mode=register" className="mt-2 inline-block font-medium underline underline-offset-4">{/[а-яё]/i.test(state.message ?? "") ? "Войти или создать аккаунт" : "Sign in or create account"}</Link>}</div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t.tryOne}</span>
        {t.exampleNames.map((name, i) => (
          <button
            key={name}
            type="button"
            disabled={pending || voiceBusy || quoting}
            onClick={() => applyExample(t.examples[i])}
            className="rounded-full border border-line px-3.5 py-2.5 transition-colors hover:border-ink"
          >
            {name}
          </button>
        ))}
        {previous !== null && (
          <span className="text-muted" aria-live="polite">
            {t.replaced}{" "}
            <button type="button" disabled={pending || voiceBusy} onClick={() => { setBrief(previous); setPrevious(null); }} className="underline underline-offset-2 hover:text-ink">
              {t.undo}
            </button>
          </span>
        )}
      </div>
    </form>
  );
}
