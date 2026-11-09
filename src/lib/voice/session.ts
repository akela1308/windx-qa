export type VoicePhase = "idle" | "starting" | "listening" | "stopping";
type Result = { isFinal: boolean; 0: { transcript: string } };
export type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<Result> }) => void) | null;
  start(): void; stop(): void; abort(): void;
};
export type RecognitionConstructor = new () => Recognition;
export function recognitionConstructor(): RecognitionConstructor | undefined {
  const host = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return window.isSecureContext ? host.SpeechRecognition ?? host.webkitSpeechRecognition : undefined;
}
export function appendDictation(base: string, transcript: string) {
  return transcript ? `${base}${base && !/\s$/.test(base) ? " " : ""}${transcript}` : base;
}

// Одна сессия без автоматического перезапуска. Поздние события после ухода со
// страницы отцепляются, окончательные результаты собираются без повторов.
export function startDictation(Ctor: RecognitionConstructor, lang: string, callbacks: {
  phase(value: VoicePhase): void; text(final: string, interim: string): void; error(code: string): void;
}) {
  const engine = new Ctor();
  let phase: VoicePhase = "starting", closed = false, final = "";
  let timer: ReturnType<typeof setTimeout>;
  function finish(abort: boolean) {
    if (closed) return;
    closed = true; clearTimeout(timer);
    engine.onstart = engine.onend = engine.onerror = engine.onresult = null;
    if (abort) try { engine.abort(); } catch { /* Уже остановлен браузером. */ }
    phase = "idle"; callbacks.phase(phase); callbacks.text(final, "");
  }
  function stop() {
    if (closed || phase === "stopping") return;
    if (phase === "starting") { finish(true); return; }
    clearTimeout(timer); phase = "stopping"; callbacks.phase(phase);
    timer = setTimeout(() => finish(true), 4000);
    try { engine.stop(); } catch { finish(true); }
  }
  engine.lang = lang; engine.continuous = true; engine.interimResults = true; engine.maxAlternatives = 1;
  engine.onstart = () => {
    if (closed || phase !== "starting") return;
    clearTimeout(timer); phase = "listening"; callbacks.phase(phase);
    timer = setTimeout(stop, 120_000);
  };
  engine.onresult = event => {
    if (closed) return;
    const complete: string[] = [], interim: string[] = [];
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      (result.isFinal ? complete : interim).push(result[0].transcript.trim());
    }
    final = complete.filter(Boolean).join(" "); callbacks.text(final, interim.filter(Boolean).join(" "));
  };
  engine.onerror = event => { if (closed) return; callbacks.error(event.error); finish(true); };
  engine.onend = () => { if (closed) return; if (!final) callbacks.error("no-speech"); finish(false); };
  callbacks.phase(phase);
  // Не оставляем интерфейс в ожидании при зависшем запросе разрешения.
  timer = setTimeout(() => { callbacks.error("timeout"); finish(true); }, 20_000);
  try { engine.start(); } catch { callbacks.error("unavailable"); finish(true); }
  return { stop, cancel: () => finish(true) };
}
