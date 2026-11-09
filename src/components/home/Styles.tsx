import Image from "next/image";
import Link from "next/link";
import type { Dict } from "@/lib/i18n/en";
import { SHOWCASE, shot } from "@/lib/showcase";

// Крупные снимки текущих публичных демонстраций. Полный просмотр и выбор — разные ссылки.
// На узком экране все варианты идут обычной вертикальной лентой.
export function Styles({ t, selected }: { t: Dict; selected?: string }) {
  const names = t.styleNames as Record<string, string[]>;
  return (
    <section id="looks" className="scroll-mt-20 py-20 md:py-28">
      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <h2 className="max-w-[18ch] font-display text-3xl font-bold leading-[1.05] tracking-tight md:text-5xl">{t.home.stylesTitle}</h2>
        <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-muted">{t.home.stylesSub}</p>
      </div>
      <ul className="mx-auto mt-10 grid max-w-[1400px] grid-cols-1 gap-x-8 gap-y-12 px-5 pb-6 md:px-8 xl:grid-cols-2">
        {SHOWCASE.map((id) => {
          const [name, line] = names[id];
          const active = selected === id;
          return (
            <li key={id} className="min-w-0">
              <Link href={`/examples/${id}`} className="group block" aria-label={`${t.home.previewStyle}: ${name}`}>
                <div className={`overflow-hidden rounded-2xl border transition-transform duration-300 group-hover:-translate-y-1.5 ${active ? "border-ink ring-4 ring-brand" : "border-line"}`}>
                  <Image src={shot(id)} alt="" width={1280} height={860} sizes="(min-width: 1280px) 40vw, 90vw" className="aspect-[16/11] h-auto w-full object-cover object-top" />
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-base font-bold tracking-tight">{name}</h3>
                  <span className="shrink-0 text-sm text-muted underline-offset-2 group-hover:text-ink group-hover:underline">{t.home.previewStyle}</span>
                </div>
                <p className="mt-1 text-sm leading-snug text-muted">{line}</p>
              </Link>
              <Link href={`/?style=${id}#create`} className="mt-2 inline-flex min-h-11 items-center text-sm underline underline-offset-4">{t.home.useStyle}: {name}</Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
