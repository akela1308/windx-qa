import { z } from "zod";
import { defineComposition } from "../registry";
import { PhotoSchema, PhotoSlot, text } from "../parts";

// Отзывы, порядок работы, вопросы, галерея.

const base = { title: text };
const quote = z.object({ text: text, who: text });

export const extras = {
  "proof.single-quote": defineComposition({
    description: "Один отзыв огромным шрифтом на всю ширину, имя мелко. Сильнее, чем стена отзывов. Отзыв придуман? Тогда в factsToConfirm.",
    props: z.object({ quote }),
    css: `.pq blockquote{margin:0;font-family:var(--f-display);font-weight:var(--d-weight);font-style:var(--d-style);font-size:clamp(1.8rem,4.4vw,3.8rem);line-height:1.15;max-width:22em;letter-spacing:var(--d-track)}
.pq blockquote::before{content:"\\201C";display:block;color:var(--accent);font-size:1.6em;line-height:.6}
.pq cite{display:block;margin-top:1.75rem;font-style:normal}`,
    render: (p) => (
      <section className="sec pq">
        <div className="wrap">
          <blockquote>{p.quote.text}<cite className="muted">{p.quote.who}</cite></blockquote>
        </div>
      </section>
    ),
  }),
  "proof.quote-columns": defineComposition({
    description: "2-3 отзыва текстом в колонках, без рамок и фона, разделены вертикальными линиями.",
    props: z.object({ ...base, quotes: z.array(quote).min(2).max(3) }),
    css: `.pc h2{margin-bottom:2.5rem}
.pc .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr))}
.pc figure{margin:0;padding:0 2rem;border-left:1px solid var(--line)}
.pc figure:first-child{padding-left:0;border-left:0}
.pc blockquote{margin:0;font-size:1.1rem}.pc figcaption{margin-top:1rem;font-size:.9rem}
@media(max-width:760px){.pc figure{padding:1.5rem 0;border-left:0;border-top:1px solid var(--line)}}`,
    render: (p) => (
      <section className="sec pc">
        <div className="wrap">
          <h2>{p.title}</h2>
          <div className="row">{p.quotes.map((q) => <figure key={q.who}><blockquote>{q.text}</blockquote><figcaption className="muted">{q.who}</figcaption></figure>)}</div>
        </div>
      </section>
    ),
  }),
  "process.steps-row": defineComposition({
    description: "Порядок работы горизонтально: крупные номера шагов в ряд, соединены линией, под каждым короткий текст.",
    props: z.object({ ...base, steps: z.array(z.object({ name: text, detail: text })).min(3).max(5) }),
    css: `.pr2 h2{margin-bottom:2.5rem}
.pr2 ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:2rem;counter-reset:s}
.pr2 li{counter-increment:s;border-top:2px solid var(--ink);padding-top:1rem}
.pr2 li::before{content:counter(s);display:block;font-family:var(--f-display);font-size:2.6rem;line-height:1;margin-bottom:.75rem;color:var(--accent)}
.pr2 h3{margin-bottom:.4rem}`,
    render: (p) => (
      <section className="sec pr2">
        <div className="wrap">
          <h2>{p.title}</h2>
          <ol>{p.steps.map((s) => <li key={s.name}><h3>{s.name}</h3><p className="muted">{s.detail}</p></li>)}</ol>
        </div>
      </section>
    ),
  }),
  "process.conversation": defineComposition({
    description: "Порядок работы как диалог вопрос-ответ: слева вопрос клиента курсивом, справа что мы делаем. Для услуг, которые пугают новичков.",
    props: z.object({ ...base, pairs: z.array(z.object({ ask: text, answer: text })).min(2).max(5) }),
    css: `.pcv h2{margin-bottom:2.5rem}
.pcv .it{display:grid;grid-template-columns:1fr 1.4fr;gap:1rem 3rem;padding:1.5rem 0;border-top:1px solid var(--line)}
.pcv .a{font-family:var(--f-display);font-style:italic;font-size:1.3rem;line-height:1.3}
@media(max-width:760px){.pcv .it{grid-template-columns:1fr}}`,
    render: (p) => (
      <section className="sec pcv">
        <div className="wrap">
          <h2>{p.title}</h2>
          {p.pairs.map((x) => <div className="it" key={x.ask}><p className="a">{x.ask}</p><p>{x.answer}</p></div>)}
        </div>
      </section>
    ),
  }),
  "faq.accordion": defineComposition({
    description: "Частые вопросы раскрывающимся списком.",
    props: z.object({ ...base, items: z.array(z.object({ q: text, a: text })).min(2).max(10) }),
    css: `.fa .grid{display:grid;grid-template-columns:1fr 2fr;gap:clamp(2rem,5vw,5rem)}
.fa details{border-top:1px solid var(--line);padding:1.1rem 0}
.fa summary{cursor:pointer;font-weight:600;font-size:1.08rem;list-style:none;display:flex;justify-content:space-between;gap:1rem}
.fa summary::after{content:"+";color:var(--accent)}.fa details[open] summary::after{content:"\\2212"}
.fa details p{margin-top:.75rem;max-width:40em}
@media(max-width:760px){.fa .grid{grid-template-columns:1fr}}`,
    render: (p) => (
      <section className="sec fa">
        <div className="wrap grid">
          <div><h2>{p.title}</h2></div>
          <div>{p.items.map((i, k) => <details key={i.q} open={k === 0}><summary>{i.q}</summary><p className="muted">{i.a}</p></details>)}</div>
        </div>
      </section>
    ),
  }),
  "gallery.mosaic": defineComposition({
    description: "Мозаика фото разного размера: одно большое и несколько маленьких. Для мест и работ, которые надо видеть.",
    props: z.object({ title: z.string().optional(), photos: z.array(PhotoSchema).min(3).max(6) }),
    css: `.gm h2{margin-bottom:2rem}
.gm .grid{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:clamp(8rem,16vw,14rem);gap:.75rem}
.gm .grid>div:first-child{grid-column:span 2;grid-row:span 2}
.gm .ph{height:100%;aspect-ratio:auto!important}
@media(max-width:760px){.gm .grid{grid-template-columns:1fr 1fr}}`,
    render: (p) => (
      <section className="sec gm">
        <div className="wrap">
          {p.title && <h2>{p.title}</h2>}
          <div className="grid">{p.photos.map((ph) => <div key={ph.subject}><PhotoSlot photo={ph} /></div>)}</div>
        </div>
      </section>
    ),
  }),
  "gallery.strip": defineComposition({
    description: "Лента фото одной высоты, уходящая за край экрана, листается вбок. Лёгкая, неформальная.",
    props: z.object({ photos: z.array(PhotoSchema).min(3).max(8), caption: z.string().optional() }),
    css: `.gs .strip{display:flex;gap:1rem;overflow-x:auto;padding:0 clamp(1.25rem,4vw,3rem);scroll-snap-type:x mandatory}
.gs .strip>div{flex:0 0 clamp(14rem,30vw,24rem);scroll-snap-align:start}
.gs .cap{margin-top:1rem}`,
    render: (p) => (
      <section className="sec gs">
        <div className="strip">{p.photos.map((ph) => <div key={ph.subject}><PhotoSlot photo={ph} ratio="3 / 4" /></div>)}</div>
        {p.caption && <div className="wrap"><p className="cap muted">{p.caption}</p></div>}
      </section>
    ),
  }),
};
