import type { Dict } from "@/lib/i18n/en";

// Вопросы владельцев: цена, домен, ошибки AI, можно ли уйти, фото.
// Две колонки текста без аккордеона: всё видно сразу, ответы короткие.
export function Faq({ t }: { t: Dict }) {
  return (
    <section id="faq" className="mx-auto w-full max-w-[1400px] scroll-mt-20 px-5 py-20 md:px-8 md:py-28">
      <h2 className="max-w-[14ch] font-display text-3xl font-bold leading-[1.05] tracking-tight md:text-5xl">{t.home.faqTitle}</h2>
      <dl className="mt-12 grid grid-cols-1 gap-x-16 gap-y-10 md:grid-cols-2">
        {t.home.faq.map(([q, a]) => (
          <div key={q} className="border-t-2 border-ink pt-4">
            <dt className="font-display text-lg font-bold tracking-tight">{q}</dt>
            <dd className="mt-2 max-w-[52ch] leading-relaxed text-muted">{a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
