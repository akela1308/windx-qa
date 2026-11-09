"use client";
import { useEffect, useRef, useState } from "react";
import { appendDictation, recognitionConstructor, startDictation, type VoicePhase } from "@/lib/voice/session";
import type { Dict } from "@/lib/i18n/en";

export function VoiceInput({ t, value, onChange, onBusy, disabled }: {
  t: Dict["home"]["voice"]; value: string; onChange(value: string): void; onBusy(value: boolean): void; disabled: boolean;
}) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [interim, setInterim] = useState("");
  const session = useRef<ReturnType<typeof startDictation> | null>(null);
  const alive = useRef(false);
  const busy = phase !== "idle";
  useEffect(() => {
    alive.current = true;
    // Проверяем поддержку только по нажатию. При загрузке страницы нет ни
    // запроса разрешения, ни доступа к микрофону, ни различий гидратации.
    return () => { alive.current = false; session.current?.cancel(); };
  }, []);
  // При смене языка кабинета завершаем текущую диктовку; следующий запуск
  // использует новый язык из переводов, без отдельного выбора в форме.
  useEffect(() => () => { session.current?.cancel(); }, [t.lang]);
  function toggle() {
    if (busy) { session.current?.stop(); return; }
    if (disabled) return;
    const Ctor = recognitionConstructor(); setAvailable(!!Ctor); setError("");
    if (!Ctor) return;
    const base = value;
    try {
      session.current = startDictation(Ctor, t.lang, {
        phase(next) { if (alive.current) { setPhase(next); onBusy(next !== "idle"); } },
        text(final, draft) { if (alive.current) { onChange(appendDictation(base, final)); setInterim(draft); } },
        error(code) { if (alive.current) setError(code); },
      });
    } catch { setError("unavailable"); setPhase("idle"); onBusy(false); }
  }
  useEffect(() => {
    const hide = () => { if (document.hidden) session.current?.cancel(); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  const message = error ? error === "not-allowed" || error === "service-not-allowed" ? t.denied : error === "no-speech" ? t.silent : error === "audio-capture" ? t.device : error === "network" ? t.network : error === "language-not-supported" ? t.languageError : t.failed : "";
  return <div className="mx-1 mb-3 border-t border-line pt-3">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={toggle} disabled={disabled || phase === "stopping"} aria-pressed={busy} aria-controls="brief" className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${busy ? "border-ink bg-brand text-on-brand" : "border-line hover:border-ink"}`}>
        {busy ? <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-current" /> : <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>}
        {busy ? phase === "stopping" ? t.finishing : t.stop : t.start}
      </button>
    </div>
    <p role="status" className="mt-2 text-xs leading-relaxed text-muted">{available === false ? t.unsupported : message || (phase === "starting" ? t.starting : phase === "listening" ? t.listening : phase === "stopping" ? t.finishing : t.hint)}</p>
    {interim && <p className="mt-1 text-sm italic text-muted">{interim}</p>}
    <p className="mt-1 text-xs leading-relaxed text-muted">{t.privacy}</p>
  </div>;
}
