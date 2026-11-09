import { z } from "zod";
import { defineComposition } from "../registry";
import { Button, CtaSchema, fitHeadline, text } from "../parts";

// Рисунок задаётся данными, без произвольной разметки, скриптов и внешних URL.
// Это иллюстрация идеи, а не выдуманное фото помещения или доказательство о бизнесе.
export const HeroGraphicSchema = z.object({
  label: text.max(180).describe("Accessible description of the abstract illustration"),
  paths: z.array(z.object({
    d: z.string().min(1).max(1200).regex(/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/, "SVG path commands and numbers only"),
    color: z.enum(["ink", "accent", "muted"]),
    fill: z.boolean().describe("true for a filled silhouette, false for an outlined path"),
  })).min(1).max(12).describe("Original abstract illustration in a 400 by 300 coordinate space. No invented factual diagrams."),
});
function Graphic({ graphic }: { graphic: z.infer<typeof HeroGraphicSchema> }) {
  return <svg className="hero-graphic" viewBox="0 0 400 300" role="img" aria-label={graphic.label}>
    {graphic.paths.map((p, i) => <path key={i} d={p.d} className={`graphic-${p.color}`} fill={p.fill ? "currentColor" : "none"} stroke={p.fill ? "none" : "currentColor"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
  </svg>;
}
const graphicCss = `.hero-graphic{display:block;width:100%;height:auto;max-height:30rem}
.hero-graphic .graphic-ink{color:inherit}.hero-graphic .graphic-accent{color:var(--accent)}.hero-graphic .graphic-muted{color:var(--muted)}
.tone-accent .hero-graphic .graphic-accent{color:var(--accent-ink)}.tone-ink .hero-graphic .graphic-accent{color:var(--bg)}
.tone-accent .hero-graphic .graphic-muted,.tone-ink .hero-graphic .graphic-muted{color:inherit;opacity:.6}`;
const copy = { headline: text.max(90), sub: text.max(350), cta: CtaSchema };

export const heroLayouts = {
  "hero.split-graphic": defineComposition({
    description: "Две равные колонки без фото: заголовок, пояснение и кнопка рядом с оригинальной векторной иллюстрацией. Рисунок слева или справа. Когда рисунок помогает понять предложение или процесс и его действительно полезно видеть рядом с текстом. Отсутствие фото само по себе не повод выбирать эту композицию.",
    props: z.object({ ...copy, graphic: HeroGraphicSchema, graphicSide: z.enum(["left", "right"]) }),
    css: `${graphicCss}.hsg{overflow-wrap:anywhere}.hsg .layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;gap:clamp(2rem,5vw,5rem)}
.hsg .copy,.hsg .art{min-width:0}.hsg h1{font-size:clamp(2rem,min(5.5vw,var(--fit,5.5vw)),5rem);line-height:1.03}
.hsg .lead{margin:1.25rem 0 1.75rem}.hsg.left .art{order:-1}
@media(max-width:760px){.hsg .layout{grid-template-columns:1fr}.hsg h1{font-size:clamp(2rem,9vw,3.5rem)}.hsg.left .art{order:0}.hsg .art{max-width:30rem;width:100%;justify-self:center}}`,
    render: p => <section className={`sec hsg ${p.graphicSide}`}><div className="wrap layout">
      <div className="copy"><h1 style={fitHeadline(p.headline,.5)}>{p.headline}</h1><p className="lead muted">{p.sub}</p><Button cta={p.cta} /></div>
      <div className="art"><Graphic graphic={p.graphic} /></div>
    </div></section>,
  }),
  "hero.action-desk": defineComposition({
    description: "Практичный главный экран без фото: слева короткое объяснение и основная кнопка, справа вертикальный список 2-4 разных действий посетителя с пояснениями и ссылками. Для нескольких понятных задач, не одинаковые карточки с иконками и не список вымышленных преимуществ.",
    props: z.object({ ...copy, actionsTitle: text, actions: z.array(z.object({ title: text, detail: text.max(180), link: CtaSchema })).min(2).max(4) }),
    css: `.had{overflow-wrap:anywhere}.had .layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:clamp(2rem,6vw,6rem);align-items:start}
.had .copy,.had aside{min-width:0}.had h1{font-size:clamp(2rem,5vw,4.8rem);line-height:1.05}.had .lead{margin:1.25rem 0 1.75rem}
.had aside{border-left:2px solid var(--accent);padding-left:clamp(1.25rem,3vw,2.5rem)}.had aside h2{font-size:1rem;font-family:var(--f-body);text-transform:none;letter-spacing:normal}
.had ul{list-style:none;padding:0;margin:.75rem 0 0}.had li{padding:1rem 0;border-bottom:1px solid var(--line)}.had h3{font-size:1.25rem;margin:0}.had li p{margin:.5rem 0;font-size:.95rem}.had li a{font-weight:600;text-underline-offset:.2em}
@media(max-width:760px){.had .layout{grid-template-columns:1fr}.had aside{border-left:0;border-top:2px solid var(--accent);padding:1.5rem 0 0}}`,
    render: p => <section className="sec had"><div className="wrap layout">
      <div className="copy"><h1 style={fitHeadline(p.headline,.52)}>{p.headline}</h1><p className="lead muted">{p.sub}</p><Button cta={p.cta} /></div>
      <aside><h2>{p.actionsTitle}</h2><ul>{p.actions.map(a=><li key={a.title}><h3>{a.title}</h3><p className="muted">{a.detail}</p><a href={a.link.href}>{a.link.label}</a></li>)}</ul></aside>
    </div></section>,
  }),
  "hero.center-stage": defineComposition({
    description: "Центральная сценическая композиция без фото: умеренный заголовок и короткий текст по центру, кнопка сразу под ними, затем широкая оригинальная векторная иллюстрация. Для коллекции, идеи или творческой студии; отличается от двух колонок и от огромной афиши со строкой фактов.",
    props: z.object({ ...copy, graphic: HeroGraphicSchema }),
    css: `${graphicCss}.hcs{overflow-wrap:anywhere}.hcs .copy{text-align:center;max-width:46rem;margin-inline:auto}.hcs h1{font-size:clamp(2rem,5vw,4.5rem);line-height:1.06}
.hcs .lead{margin:1.25rem auto 1.75rem;max-width:32em}.hcs .art{max-width:50rem;margin:clamp(2rem,5vw,4rem) auto 0}.hcs .hero-graphic{max-height:24rem}
@media(max-width:760px){.hcs h1{font-size:clamp(2rem,8vw,3.4rem)}.hcs .art{margin-top:2rem}}`,
    render: p => <section className="sec hcs"><div className="wrap"><div className="copy"><h1>{p.headline}</h1><p className="lead muted">{p.sub}</p><Button cta={p.cta} /></div><div className="art"><Graphic graphic={p.graphic} /></div></div></section>,
  }),
};
