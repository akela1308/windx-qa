import Link from "next/link";
import type { Dict } from "@/lib/i18n/en";

// Три проверки доступны в редакторе, каждая со своими границами.
export function Checks({ t }: { t: Dict }) {
  return (
    <section className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-10 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[1fr_1.3fr]">
      <h2 className="font-display text-3xl font-bold leading-[1.05] tracking-tight md:text-5xl">{t.home.checksTitle}</h2>
      <ol className="border-t-2 border-ink">
        {t.home.checks.map(([name, text], i) => (
          <li key={name} className="grid grid-cols-[3rem_1fr] gap-x-4 gap-y-1 border-b border-line py-6 sm:grid-cols-[3rem_1fr_auto]">
            <span className="font-mono text-sm text-muted">{i + 1}</span>
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight md:text-xl">{name}</h3>
              <p className="mt-1 max-w-[52ch] text-muted">{text}</p>
            </div>
            <span className="col-start-2 self-start justify-self-start rounded-full border border-line px-3 py-1 text-xs text-muted sm:col-start-3">{<Link href="/sites">{i === 0 ? t.editor.checkSearch : i === 1 ? t.editor.checkWorks : t.editor.checkRules}</Link>}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
