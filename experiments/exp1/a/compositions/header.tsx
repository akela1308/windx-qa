import { z } from "zod";
import { defineComposition } from "../registry";
import { Button, CtaSchema, PhotoSchema, BrandLogo, text } from "../parts";

const links = z.array(z.object({ label: text, href: text })).max(5);

export const header = {
  "header.inline": defineComposition({
    description: "Обычная шапка: название слева, ссылки и кнопка справа.",
    props: z.object({ name: text, logo: PhotoSchema.optional(), links, cta: CtaSchema.optional() }),
    css: `.h-in{display:flex;align-items:center;justify-content:space-between;gap:1.5rem;padding-block:1.25rem;flex-wrap:wrap}
.h-in .nm{font-family:var(--f-display);font-weight:var(--d-weight);font-size:1.3rem;text-decoration:none;text-transform:var(--d-case);letter-spacing:var(--d-track)}
.h-in nav{display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;font-size:.95rem}
.h-in nav a{text-decoration:none}`,
    render: (p) => (
      <header className="wrap h-in">
        <a className="nm" href="#">{p.logo && <BrandLogo photo={p.logo} />}{p.name}</a>
        <nav>
          {p.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
          <Button cta={p.cta} />
        </nav>
      </header>
    ),
  }),
  "header.centered": defineComposition({
    description: "Название крупно по центру, ссылки строкой под ним, тонкая линия. Спокойно, редакционно.",
    props: z.object({ name: text, logo: PhotoSchema.optional(), tagline: z.string().optional(), links }),
    css: `.h-c{text-align:center;padding-block:1.75rem 1rem;border-bottom:1px solid var(--line)}
.h-c .nm{font-family:var(--f-display);font-weight:var(--d-weight);font-size:clamp(1.6rem,3vw,2.4rem);text-transform:var(--d-case);letter-spacing:var(--d-track);text-decoration:none;font-style:var(--d-style)}
.h-c .tg{font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-top:.35rem}
.h-c nav{display:flex;justify-content:center;gap:1.75rem;margin-top:1rem;font-size:.9rem;flex-wrap:wrap}
.h-c nav a{text-decoration:none}`,
    render: (p) => (
      <header className="wrap h-c">
        <a className="nm" href="#">{p.logo && <BrandLogo photo={p.logo} />}{p.name}</a>
        {p.tagline && <p className="tg">{p.tagline}</p>}
        <nav>{p.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}</nav>
      </header>
    ),
  }),
  "header.minimal": defineComposition({
    description: "Минимальная шапка: название и один контакт (телефон или кнопка), без меню.",
    props: z.object({ name: text, logo: PhotoSchema.optional(), contact: CtaSchema }),
    css: `.h-m{display:flex;justify-content:space-between;align-items:baseline;padding-block:1.25rem;gap:1rem;flex-wrap:wrap}
.h-m .nm{font-family:var(--f-display);font-weight:var(--d-weight);font-size:1.15rem;text-transform:var(--d-case);letter-spacing:var(--d-track);text-decoration:none}
.h-m .ct{font-variant-numeric:tabular-nums;text-decoration:none;border-bottom:1px solid currentColor}`,
    render: (p) => (
      <header className="wrap h-m">
        <a className="nm" href="#">{p.logo && <BrandLogo photo={p.logo} />}{p.name}</a>
        <a className="ct" href={p.contact.href}>{p.contact.label}</a>
      </header>
    ),
  }),
};
