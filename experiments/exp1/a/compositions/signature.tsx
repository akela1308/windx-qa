import { z } from "zod";
import { defineComposition } from "../registry";
import { text } from "../parts";
import { checkSvg } from "../svg";

// Запоминающиеся фирменные элементы. Это данные, а не код:
// даже рисунок задаётся только списком SVG-путей, которые мы проверяем.

const svgPath = z.string().regex(/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/, "Только команды SVG-пути и числа").max(1200);

export const signature = {
  "signature.marquee": defineComposition({
    description: "Бегущая строка: короткие фразы повторяются лентой через всю ширину, медленно движутся. Шумно, живо.",
    props: z.object({ phrases: z.array(text).min(2).max(6), separator: z.string().max(3) }),
    css: `.mq{overflow:hidden;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:1.1rem 0;white-space:nowrap}
.mq .tr{display:inline-flex;gap:2rem;animation:mq 40s linear infinite;font-family:var(--f-display);font-size:clamp(1.4rem,3vw,2.4rem);text-transform:var(--d-case);font-weight:var(--d-weight)}
.mq .sp{color:var(--accent)}
.tone-accent .mq .sp{color:var(--accent-ink);opacity:.6}
@keyframes mq{to{transform:translateX(-50%)}}
@media(prefers-reduced-motion:reduce){.mq .tr{animation:none}}`,
    render: (p) => {
      const run = p.phrases.flatMap((t, i) => [<span key={`t${i}`}>{t}</span>, <span key={`s${i}`} className="sp">{p.separator}</span>]);
      return <div className="mq" aria-hidden="true"><div className="tr">{run}{run}{run}{run}</div></div>;
    },
  }),
  "signature.stamp": defineComposition({
    description: "Круглая печать: текст по кругу и короткое слово или символ в центре, медленно вращается. Ставится отдельно между секциями, выровнена влево, по центру или вправо.",
    props: z.object({ ringText: text.max(60), center: text.max(6), align: z.enum(["left", "center", "right"]) }),
    css: `.stp{display:flex;padding-block:1rem}.stp.left{justify-content:flex-start}.stp.center{justify-content:center}.stp.right{justify-content:flex-end}
.stp svg{width:clamp(7rem,14vw,10rem);height:auto;color:var(--accent)}
.stp .ring{animation:spin 30s linear infinite;transform-origin:50% 50%}
.stp text{font-family:var(--f-body);font-size:10.5px;letter-spacing:2.5px;text-transform:uppercase;fill:currentColor}
.stp .c{font-family:var(--f-display);font-size:26px;letter-spacing:0;text-transform:none;fill:var(--ink)}
@keyframes spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.stp .ring{animation:none}}`,
    render: (p) => (
      <div className={`wrap stp ${p.align}`} aria-hidden="true">
        <svg viewBox="0 0 120 120">
          <defs><path id="ring" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" /></defs>
          <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="1" />
          <g className="ring"><text><textPath href="#ring">{`${p.ringText} · `.repeat(Math.max(1, Math.floor(42 / (p.ringText.length + 3))))}</textPath></text></g>
          <text className="c" x="60" y="69" textAnchor="middle">{p.center}</text>
        </svg>
      </div>
    ),
  }),
  "signature.big-word": defineComposition({
    description: "Одно слово огромным шрифтом во всю ширину, обрезанное краем экрана, контуром или заливкой. Работает как вывеска.",
    props: z.object({ word: text.max(16), style: z.enum(["outline", "solid", "accent"]) }),
    css: `.bw{overflow:hidden;padding:1rem 0;line-height:.8}
.bw p{font-family:var(--f-display);font-weight:var(--d-weight);text-transform:var(--d-case);font-size:clamp(5rem,24vw,22rem);white-space:nowrap;letter-spacing:-.03em;margin-left:-.06em}
.bw.outline p{color:transparent;-webkit-text-stroke:1.5px var(--ink)}
.bw.accent p{color:var(--accent)}`,
    render: (p) => <div className={`bw ${p.style}`} aria-hidden="true"><p>{p.word}</p></div>,
  }),
  "signature.ornament": defineComposition({
    description: "Декоративная разделительная полоса из повторяющегося узора: волна, зигзаг, цепочка, точки или лучи.",
    props: z.object({ pattern: z.enum(["wave", "zigzag", "chain", "dots", "rays"]), height: z.enum(["thin", "bold"]) }),
    css: `.orn{color:var(--accent);padding:.5rem 0}.orn svg{display:block;width:100%}`,
    render: (p) => {
      const h = p.height === "bold" ? 28 : 14;
      const shapes: Record<typeof p.pattern, string> = {
        wave: `<path d="M0 ${h / 2} Q 10 0 20 ${h / 2} T 40 ${h / 2}" fill="none" stroke="currentColor" stroke-width="2"/>`,
        zigzag: `<path d="M0 ${h - 2} L10 2 L20 ${h - 2} L30 2 L40 ${h - 2}" fill="none" stroke="currentColor" stroke-width="2"/>`,
        chain: `<ellipse cx="10" cy="${h / 2}" rx="9" ry="${h / 2 - 2}" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="30" cy="${h / 2}" rx="9" ry="${h / 2 - 2}" fill="none" stroke="currentColor" stroke-width="2"/>`,
        dots: `<circle cx="10" cy="${h / 2}" r="${h / 5}" fill="currentColor"/><circle cx="30" cy="${h / 2}" r="${h / 5}" fill="currentColor"/>`,
        rays: `<path d="M0 ${h} L20 0 L40 ${h}" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M20 ${h} L20 0" stroke="currentColor" stroke-width="1.5"/>`,
      };
      const svg = `<svg height="${h}" aria-hidden="true"><defs><pattern id="o-${p.pattern}" width="40" height="${h}" patternUnits="userSpaceOnUse">${shapes[p.pattern]}</pattern></defs><rect width="100%" height="${h}" fill="url(#o-${p.pattern})"/></svg>`;
      return <div className="orn" dangerouslySetInnerHTML={{ __html: svg }} />;
    },
  }),
  "signature.note": defineComposition({
    description: "Рукописная записка от владельца на чуть повёрнутом листке, как прикреплённая к доске. Тепло и лично.",
    props: z.object({ text: text.max(220), from: z.string().optional(), tilt: z.enum(["left", "right"]) }),
    css: `.nt{display:flex;justify-content:center;padding-block:2rem;overflow-x:clip}
.nt .pp{font-family:'Caveat',cursive;font-size:clamp(1.5rem,2.6vw,2rem);line-height:1.25;background:var(--surface);color:var(--ink);padding:1.75rem 2rem;max-width:min(26rem,calc(100% - 1.5rem));box-shadow:0 1px 0 var(--line),0 12px 24px -16px rgba(0,0,0,.35)}
.nt.left .pp{transform:rotate(-2.5deg)}.nt.right .pp{transform:rotate(2deg)}
.nt .fr{display:block;margin-top:.75rem;text-align:right}`,
    render: (p) => (
      <div className={`wrap nt ${p.tilt}`}><p className="pp">{p.text}{p.from && <span className="fr">{p.from}</span>}</p></div>
    ),
  }),
  "signature.drawing": defineComposition({
    description: "Простой линейный рисунок-талисман (например, кот, велосипед, лист) из SVG-путей в поле 200x200, рисуется цветом accent. Можно добавить подпись. Пути должны образовывать узнаваемый силуэт.",
    props: z.object({
      paths: z.array(svgPath).min(1).max(12).describe("Значения атрибута d для <path>, координаты 0..200"),
      caption: z.string().optional(),
      align: z.enum(["left", "center", "right"]),
      size: z.enum(["small", "medium", "large"]),
    }),
    css: `.dr{display:flex;flex-direction:column;padding-block:1.5rem}.dr.left{align-items:flex-start}.dr.center{align-items:center}.dr.right{align-items:flex-end}
.dr svg{color:var(--accent)}.dr.small svg{width:6rem}.dr.medium svg{width:11rem}.dr.large svg{width:18rem}
.dr p{margin-top:.75rem;font-size:.9rem}`,
    render: (p) => (
      <div className={`wrap dr ${p.align} ${p.size}`}>
        <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {p.paths.map((d, i) => <path key={i} d={d} />)}
        </svg>
        {p.caption && <p className="muted">{p.caption}</p>}
      </div>
    ),
  }),
  "signature.custom-svg": defineComposition({
    description: "Свободный фирменный рисунок, который ты рисуешь сам под этот бизнес: план помещения, предмет ремесла, схема, талисман, карта района. Внутренняя разметка SVG (без тега svg), простые фигуры, цвета только currentColor плюс class ink/accent/muted/bg. Лучше один продуманный узнаваемый рисунок, чем орнамент.",
    props: z.object({
      viewBox: z.string().regex(/^0 0 \d{2,4} \d{2,4}$/, "Формат: 0 0 ширина высота"),
      svg: z.string().min(20).superRefine((v, ctx) => checkSvg(v).forEach((m) => ctx.addIssue({ code: "custom", message: m }))),
      caption: z.string().optional(),
      align: z.enum(["left", "center", "right", "wide"]),
    }),
    css: `.cs2{padding:2rem 0}.cs2 .in{display:flex;flex-direction:column}.cs2.left .in{align-items:flex-start}.cs2.center .in{align-items:center}.cs2.right .in{align-items:flex-end}
.cs2 svg{width:min(100%,34rem);height:auto;color:var(--ink);overflow:visible}.cs2.wide svg{width:100%}
.cs2 .ink{color:var(--ink)}.cs2 .accent{color:var(--accent)}.cs2 .muted{color:var(--muted)}.cs2 .bg{color:var(--bg)}
.cs2 text{font-family:var(--f-body)}.cs2 p{margin-top:.75rem;font-size:.9rem}`,
    render: (p) => (
      <div className={`cs2 ${p.align}`}>
        <div className="wrap in">
          <svg viewBox={p.viewBox} aria-hidden="true" dangerouslySetInnerHTML={{ __html: p.svg }} />
          {p.caption && <p className="muted">{p.caption}</p>}
        </div>
      </div>
    ),
  }),
  "signature.marked-line": defineComposition({
    description: "Одна крупная фраза во всю ширину, где ключевые слова выделены как будто от руки: маркером, обводкой или подчёркиванием. Неожиданно и по-человечески. Фраза конкретная, про этот бизнес, без девизов.",
    props: z.object({ before: z.string(), marked: text.max(40), after: z.string(), mark: z.enum(["marker", "circle", "underline", "none"]) }),
    css: `.ml p{font-family:var(--f-display);font-weight:var(--d-weight);font-style:var(--d-style);text-transform:var(--d-case);font-size:clamp(2rem,5.5vw,4.8rem);line-height:1.1;max-width:18em;letter-spacing:var(--d-track)}
.ml .mk{position:relative;white-space:normal;display:inline-block;max-width:100%;overflow-wrap:anywhere}
.ml .marker .mk{background:linear-gradient(transparent 55%,color-mix(in srgb,var(--accent) 70%,transparent) 55%,color-mix(in srgb,var(--accent) 70%,transparent) 92%,transparent 92%);padding:0 .08em}
.ml .mk svg{position:absolute;left:-6%;width:112%;pointer-events:none;color:var(--accent);overflow:visible}
.ml .circle .mk svg{top:-18%;height:136%}.ml .underline .mk svg{left:0;width:100%;bottom:-.25em;height:.4em}
.tone-accent .ml .mk svg{color:var(--accent-ink)}
.tone-accent .ml .marker .mk{background:linear-gradient(transparent 55%,color-mix(in srgb,var(--accent-ink) 30%,transparent) 55%,color-mix(in srgb,var(--accent-ink) 30%,transparent) 92%,transparent 92%)}`,
    render: (p) => (
      <section className="sec ml">
        <div className={`wrap ${p.mark}`}>
          <p>
            {p.before}{p.before && " "}
            <span className={p.mark === "none" ? undefined : "mk"}>
              {p.marked}
              {p.mark === "circle" && (
                <svg viewBox="0 0 200 60" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M30 8 C 90 -2, 190 6, 194 28 C 198 52, 110 58, 50 54 C 10 50, 2 36, 8 22 C 14 10, 60 4, 120 6" /></svg>
              )}
              {p.mark === "underline" && (
                <svg viewBox="0 0 200 20" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" aria-hidden="true"><path d="M4 12 C 50 4, 90 18, 140 8 S 190 10, 196 6" /></svg>
              )}
            </span>
            {p.after && " "}{p.after}
          </p>
        </div>
      </section>
    ),
  }),
  "signature.giant-figure": defineComposition({
    description: "Одна цифра или короткое значение огромным размером как графика (цена, время, количество мест) и короткая подпись рядом. Например «£15» и «puncture fixed while you wait». Значение должно быть из запроса клиента или попасть в factsToConfirm.",
    props: z.object({ value: text.max(8), caption: text.max(90), align: z.enum(["left", "right"]) }),
    css: `.gf .in{display:flex;align-items:flex-end;gap:clamp(1rem,3vw,2.5rem);flex-wrap:wrap}.gf.right .in{flex-direction:row-reverse;text-align:right}
.gf .v{font-family:var(--f-display);font-weight:var(--d-weight);font-size:clamp(6rem,22vw,20rem);line-height:.8;letter-spacing:-.04em;color:var(--accent)}
.gf .c{font-size:clamp(1.1rem,2vw,1.5rem);max-width:16em;padding-bottom:.6em}
/* На фоне цвета accent цифра того же цвета пропадала: берём контрастный. */
.tone-accent .gf .v{color:var(--accent-ink)}`,
    render: (p) => (
      <section className={`sec gf ${p.align}`}>
        <div className="wrap in"><p className="v">{p.value}</p><p className="c">{p.caption}</p></div>
      </section>
    ),
  }),
};
