import Image from "next/image";
import type { Dict } from "@/lib/i18n/en";
import { shot, type StyleId } from "@/lib/showcase";
import { PromptBox } from "./PromptBox";

// Слева описание и создание, справа снимки публичных демонстраций текущего каталога.
// Форма остаётся в обычном потоке, даже когда её содержимое выше окна.
// На телефоне и планшете веер стоит под полем ввода.
const FAN: { id: StyleId; className: string }[] = [
  { id: "clear-product", className: "left-0 top-[4%] -rotate-[6deg]" },
  { id: "night-shift", className: "left-[38%] top-0 rotate-[4deg]" },
  { id: "signal", className: "left-[18%] top-[44%] -rotate-[1deg]" },
];

export function Hero({ t, locale, style, styleName, brief, template, trial = false }: { t: Dict; locale:string; style?: string; styleName?: string; brief?: string; template?: number; trial?: boolean }) {
  return (
    <section className="relative isolate flex min-h-[calc(100dvh-3.5rem)] items-start lg:min-h-dvh">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 -z-10 h-[70%] w-[70%] rounded-full bg-brand/20 blur-[120px]"
      />
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-12 px-5 py-12 md:px-10 xl:grid-cols-[1.05fr_1fr]">
        <div>
          <h1 className="rise font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl 2xl:text-6xl">
            {t.home.title}
          </h1>
          <p className="rise mt-5 max-w-[46ch] text-lg leading-relaxed text-muted [animation-delay:80ms]">{t.home.sub}</p>
          {trial && <p className="mt-3 max-w-[52ch] text-sm text-muted">{t.trial.homeHint}</p>}
          <div className="mt-8">
            <PromptBox
              locale={locale}
              key={brief ?? ""}
              t={{ ...t.home, clarifyWhat: t.create.clarifyWhat, clarifyWhy: t.create.clarifyWhy, submitHint: t.tools.submitHint }}
              style={style}
              styleName={styleName}
              initialBrief={brief}
              template={template}
            />
          </div>
        </div>
        <div className="relative mx-auto aspect-[5/4] w-[90%] max-w-[560px] xl:w-full xl:max-w-none" aria-hidden="true">
          {FAN.map((f, i) => (
            <div
              key={f.id}
              className={`rise absolute w-[62%] overflow-hidden rounded-2xl border border-ink bg-panel shadow-[8px_8px_0_0_var(--shadow)] transition-transform duration-300 hover:-translate-y-2 ${f.className}`}
              style={{ animationDelay: `${200 + i * 110}ms` }}
            >
              <Image src={shot(f.id)} alt="" width={1280} height={860} sizes="30vw" priority={i === 2} className="h-auto w-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
