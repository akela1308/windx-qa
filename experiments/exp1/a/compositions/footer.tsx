import { z } from "zod";
import type { CSSProperties } from "react";
import { defineComposition } from "../registry";
import { text, PhotoSchema, BrandLogo } from "../parts";

// В подвале нет значка конструктора: это продуктовое требование.

// Size to this column and the name length. Wrapping remains the hard guarantee
// for unusually wide glyphs, long words, uploaded logos and fallback fonts.
const nameSize = (name: string): CSSProperties => ({
  "--footer-fit": `${Math.min(14, 90 / (0.75 * Math.max([...name.trim()].length, 1))).toFixed(2)}cqw`,
} as CSSProperties);

export const footer = {
  "footer.simple": defineComposition({
    description: "Простой подвал: название, адрес, пара ссылок, год.",
    props: z.object({ name: text, logo: PhotoSchema.optional(), lines: z.array(text).max(4), links: z.array(z.object({ label: text, href: text })).max(5) }),
    css: `.fs{border-top:1px solid var(--line);padding:2.5rem 0;font-size:.9rem}
.fs .in{display:flex;justify-content:space-between;gap:2rem;flex-wrap:wrap}
.fs .nm{font-family:var(--f-display);font-size:1.2rem;margin-bottom:.5rem}
.fs nav{display:flex;gap:1.25rem;flex-wrap:wrap}`,
    render: (p) => (
      <footer className="fs">
        <div className="wrap in">
          <div><p className="nm">{p.logo && <BrandLogo photo={p.logo} />}{p.name}</p>{p.lines.map((l) => <p key={l} className="muted">{l}</p>)}</div>
          <nav>{p.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}</nav>
        </div>
      </footer>
    ),
  }),
  "footer.big-name": defineComposition({
    description: "Подвал, где название бизнеса набрано огромным шрифтом во всю ширину, а над ним строка мелких сведений.",
    props: z.object({ name: text, logo: PhotoSchema.optional(), lines: z.array(text).max(4) }),
    css: `.fb{padding:3rem 0 1rem}
.fb .wrap{container-type:inline-size}
.fb .ln{display:flex;gap:2rem;flex-wrap:wrap;font-size:.9rem;border-bottom:1px solid var(--line);padding-bottom:1.5rem}
.fb .nm{font-family:var(--f-display);font-weight:var(--d-weight);text-transform:var(--d-case);font-size:clamp(2rem,var(--footer-fit,14cqw),13rem);line-height:1.05;letter-spacing:-.03em;margin-top:1.5rem;white-space:normal;overflow-wrap:anywhere;text-wrap:balance}`,
    render: (p) => (
      <footer className="fb">
        <div className="wrap">
          <div className="ln">{p.lines.map((l) => <span key={l} className="muted">{l}</span>)}</div>
          <p className="nm" style={nameSize(p.name)}>{p.logo && <BrandLogo photo={p.logo} />}{p.name}</p>
        </div>
      </footer>
    ),
  }),
};
