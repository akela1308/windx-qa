import Link from "next/link";
import type { Dict } from "@/lib/i18n/en";

// Обещание из мастер-контекста: никакого значка конструктора на сайте клиента.
// Набрано как плакат: первая строка с кислотным маркером.
export function NoBadge({ t }: { t: Dict }) {
  const [first, second] = t.home.badgeLine;
  return (
    <section className="bg-ink text-bg">
      <div className="mx-auto max-w-[1400px] px-5 py-20 md:px-8 md:py-28">
        <p className="max-w-[16ch] font-display text-4xl font-bold leading-[1.1] tracking-tight md:text-7xl">
          <span className="box-decoration-clone bg-brand px-2 text-on-brand">{first}</span>
          <br />
          <span className="mt-3 inline-block text-bg/70">{second}</span>
        </p>
        <Link href="/" className="mt-12 inline-block rounded-full bg-brand px-6 py-3 font-medium text-on-brand transition-transform active:scale-[0.98]">
          {t.nav.cta}
        </Link>
      </div>
    </section>
  );
}

export function Footer({ t }: { t: Dict }) {
  const links: [string, string][] = [["/", t.nav.cta], ["/templates", t.shell.templates], ["/sites", t.nav.sites], ["/how", t.shell.how]];
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-5 py-12 text-sm md:grid-cols-[1fr_auto] md:px-8">
        <div>
          <span className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="inline-block size-3.5 rounded-[3px] bg-brand ring-1 ring-ink" aria-hidden="true" />
            windx
          </span>
          <p className="mt-2 max-w-[36ch] text-muted">{t.home.footer}</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-muted">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="py-1 transition-colors hover:text-ink">{label}</a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
