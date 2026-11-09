import { z } from "zod";
import { defineComposition } from "../registry";
import { PhotoSchema, PhotoSlot, text } from "../parts";

const base = { title: text };

export const story = {
  "story.longform": defineComposition({
    description: "Рассказ о бизнесе в несколько абзацев узкой колонкой, как статья, с выносной цитатой на полях. Для бизнеса, где важны люди и подход.",
    props: z.object({ ...base, paragraphs: z.array(text).min(2).max(6), pullQuote: z.string().optional() }),
    css: `.sl2 .grid{display:grid;grid-template-columns:1fr 2fr 1fr;gap:clamp(1.5rem,4vw,4rem)}
.sl2 h2{grid-column:2;margin-bottom:2rem}
.sl2 .body{grid-column:2}.sl2 .body p+p{margin-top:1.1em}
.sl2 .body p:first-child{font-size:1.2rem}
.sl2 blockquote{grid-column:3;grid-row:2;margin:0;font-family:var(--f-display);font-style:italic;font-size:1.35rem;line-height:1.3;border-top:2px solid var(--accent);padding-top:1rem;align-self:start}
.sl2 .lblw{grid-column:1}
@media(max-width:900px){.sl2 .grid{grid-template-columns:1fr}.sl2 h2,.sl2 .body,.sl2 blockquote,.sl2 .lblw{grid-column:1;grid-row:auto}}`,
    render: (p) => (
      <section className="sec sl2">
        <div className="wrap grid">
          <div className="lblw"></div>
          <h2>{p.title}</h2>
          <div className="body">{p.paragraphs.map((t) => <p key={t.slice(0, 24)}>{t}</p>)}</div>
          {p.pullQuote && <blockquote>{p.pullQuote}</blockquote>}
        </div>
      </section>
    ),
  }),
  "story.portrait": defineComposition({
    description: "Портрет человека или места рядом с коротким текстом от первого лица и подписью (имя, роль).",
    props: z.object({ ...base, text: text, signature: z.string().optional(), photo: PhotoSchema }),
    css: `.spo .grid{display:grid;grid-template-columns:5fr 6fr;gap:clamp(2rem,5vw,5rem);align-items:center}
.spo h2{margin-bottom:1.5rem}.spo .sig{margin-top:1.5rem;font-style:italic}
@media(max-width:760px){.spo .grid{grid-template-columns:1fr}}`,
    render: (p) => (
      <section className="sec spo">
        <div className="wrap grid">
          <PhotoSlot photo={p.photo} ratio="4 / 5" />
          <div>
            <h2>{p.title}</h2>
            <p className="lead">{p.text}</p>
            {p.signature && <p className="sig muted">{p.signature}</p>}
          </div>
        </div>
      </section>
    ),
  }),
  "story.timeline": defineComposition({
    description: "История вехами по годам: вертикальная линия, год крупно, событие рядом. Когда у бизнеса есть реальная история.",
    props: z.object({ ...base, events: z.array(z.object({ when: text, what: text })).min(3).max(8) }),
    css: `.stl h2{margin-bottom:2.5rem}
.stl ol{list-style:none;margin:0;padding:0;border-left:1px solid var(--line)}
.stl li{display:grid;grid-template-columns:8rem 1fr;gap:1.5rem;padding:0 0 2rem 1.75rem;position:relative}
.stl li::before{content:"";position:absolute;left:-5px;top:.55em;width:9px;height:9px;border-radius:50%;background:var(--accent)}
.stl .w{font-family:var(--f-display);font-size:1.5rem;line-height:1.1}
@media(max-width:600px){.stl li{grid-template-columns:1fr;gap:.25rem}}`,
    render: (p) => (
      <section className="sec stl">
        <div className="wrap">
          <h2>{p.title}</h2>
          <ol>{p.events.map((e) => <li key={e.when + e.what.slice(0, 10)}><span className="w">{e.when}</span><span>{e.what}</span></li>)}</ol>
        </div>
      </section>
    ),
  }),
  "story.principles": defineComposition({
    description: "Принципы или «почему мы» как короткие утверждения крупным текстом одно под другим, с пояснением мелко. Без иконок и рамок.",
    props: z.object({ ...base, items: z.array(z.object({ claim: text, detail: z.string().optional() })).min(2).max(5) }),
    css: `.spr h2{margin-bottom:2.5rem}
.spr .it{display:grid;grid-template-columns:3fr 2fr;gap:1rem 3rem;padding:1.75rem 0;border-top:1px solid var(--line);align-items:baseline}
.spr .c{font-family:var(--f-display);font-weight:var(--d-weight);font-style:var(--d-style);font-size:clamp(1.4rem,2.6vw,2.1rem);line-height:1.15;letter-spacing:var(--d-track)}
@media(max-width:760px){.spr .it{grid-template-columns:1fr}}`,
    render: (p) => (
      <section className="sec spr">
        <div className="wrap">
          <h2>{p.title}</h2>
          {p.items.map((i) => <div className="it" key={i.claim}><p className="c">{i.claim}</p>{i.detail && <p className="muted">{i.detail}</p>}</div>)}
        </div>
      </section>
    ),
  }),
  "story.numbers": defineComposition({
    description: "Несколько больших чисел в ряд с подписями. Каждое число это факт, который владелец должен подтвердить, поэтому добавь его в factsToConfirm.",
    props: z.object({ ...base, figures: z.array(z.object({ value: text, caption: text })).min(2).max(4) }),
    css: `.snu h2{margin-bottom:2.5rem}
.snu .row{display:flex;flex-wrap:wrap;gap:2rem clamp(2rem,6vw,6rem);border-top:1px solid var(--line);padding-top:2rem}
.snu .v{font-family:var(--f-display);font-weight:var(--d-weight);font-size:clamp(2.6rem,6vw,5rem);line-height:1}
.snu .cp{margin-top:.5rem;max-width:14em}`,
    render: (p) => (
      <section className="sec snu">
        <div className="wrap">
          <h2>{p.title}</h2>
          <div className="row">{p.figures.map((f) => <div key={f.caption}><p className="v">{f.value}</p><p className="cp muted">{f.caption}</p></div>)}</div>
        </div>
      </section>
    ),
  }),
  "story.letter": defineComposition({
    description: "Короткое письмо от владельца посетителю: обращение, 2-4 абзаца от первого лица, подпись. Узкая колонка, как настоящее письмо. Теплее, чем «о нас».",
    props: z.object({ greeting: text, paragraphs: z.array(text).min(2).max(4), signoff: text, name: text }),
    css: `.slt .paper{max-width:38rem;margin:0 auto}
.slt .gr{font-family:var(--f-display);font-style:italic;font-size:1.6rem;margin-bottom:1.25rem}
.slt .paper p+p{margin-top:1em}.slt .so{margin-top:2rem}.slt .nm{font-family:'Caveat',cursive;font-size:2rem;line-height:1.1}`,
    render: (p) => (
      <section className="sec slt">
        <div className="wrap">
          <div className="paper">
            <p className="gr">{p.greeting}</p>
            {p.paragraphs.map((t) => <p key={t.slice(0, 24)}>{t}</p>)}
            <p className="so muted">{p.signoff}</p>
            <p className="nm">{p.name}</p>
          </div>
        </div>
      </section>
    ),
  }),
};
