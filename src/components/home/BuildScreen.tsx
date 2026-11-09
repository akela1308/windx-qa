"use client";

import type { Dict } from "@/lib/i18n/en";

// Экран сборки сайта: показывается, пока идёт генерация.
// Шаги загораются по очереди, внизу успокаивающая строка: ничего не опубликовано.
// Сейчас шаги идут по времени; когда подключим модель, их будут двигать реальные события.
export function BuildScreen({ t, styleName }: { t: Dict["home"]["building"]; styleName?: string }) {
  return (
    <div role="status" aria-live="polite" className="mt-4 rounded-2xl border border-line bg-panel p-5">
      <div className="w-full max-w-md">
        <span className="inline-block size-4 animate-spin rounded-[3px] bg-brand ring-1 ring-ink [animation-duration:2.4s]" aria-hidden="true" />
        <h2 className="mt-3 font-display text-xl font-bold leading-tight tracking-tight">{t.title}</h2>
        {styleName && <p className="mt-2 text-muted">{styleName}</p>}
        <ol className="mt-4 space-y-2">
          {t.steps.map((s, i) => (
            <li key={s} className="build-step flex items-center gap-3 text-sm" style={{ animationDelay: `${i * 0.6}s` }}>
              <span className="grid size-6 shrink-0 place-items-center rounded-full border border-ink font-mono text-xs">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t border-line pt-4 text-sm text-muted">{t.calm}</p>
      </div>
    </div>
  );
}
