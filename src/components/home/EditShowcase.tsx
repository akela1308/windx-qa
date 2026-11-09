import Image from "next/image";
import type { Dict } from "@/lib/i18n/en";

// Как идут правки: настоящий скриншот редактора и три коротких пояснения рядом.
export function EditShowcase({ t }: { t: Dict }) {
  return (
    <section className="border-y border-line bg-panel">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[1.6fr_1fr] lg:items-center">
        <div className="overflow-hidden rounded-2xl border border-ink shadow-[8px_8px_0_0_var(--shadow)]">
          <Image src="/showcase/editor.jpg" alt="WINDX editor: chat on the left, live site on the right" width={1440} height={900} sizes="(min-width: 1024px) 60vw, 100vw" className="h-auto w-full" />
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold leading-[1.05] tracking-tight md:text-4xl">{t.home.editTitle}</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">{t.home.editSub}</p>
          <dl className="mt-8 space-y-5">
            {t.home.editPoints.map(([term, text]) => (
              <div key={term}>
                <dt className="font-medium">{term}</dt>
                <dd className="mt-0.5 text-muted">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
