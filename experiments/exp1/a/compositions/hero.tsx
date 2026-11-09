import { z } from "zod";
import { defineComposition } from "../registry";
import { Button, CtaSchema, fitHeadline, PhotoSchema, PhotoSlot, text } from "../parts";

export const hero = {
  "hero.split-photo": defineComposition({
    description: "Главный экран в две колонки: заголовок, подзаголовок и одна кнопка с одной стороны, фото с другой.",
    props: z.object({
      headline: text,
      sub: text,
      cta: CtaSchema,
      photo: PhotoSchema,
      photoSide: z.enum(["left", "right"]),
    }),
    css: `.hs{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(2rem,5vw,5rem);align-items:center}
.hs.left .hs-ph{order:-1}
.hs .lead{margin:1.5rem 0 2rem}
.hs .acts{display:flex;gap:1rem;flex-wrap:wrap}
@media(max-width:760px){.hs{grid-template-columns:1fr}.hs.left .hs-ph{order:0}}`,
    render: (p) => (
      <section className="sec">
        <div className={`wrap hs ${p.photoSide}`}>
          <div>
            <h1 style={fitHeadline(p.headline, 0.5)}>{p.headline}</h1>
            <p className="lead muted">{p.sub}</p>
            <div className="acts"><Button cta={p.cta} /></div>
          </div>
          <div className="hs-ph"><PhotoSlot photo={p.photo} ratio="4 / 5" /></div>
        </div>
      </section>
    ),
  }),
  "hero.type-poster": defineComposition({
    description: "Афиша: огромный заголовок на всю ширину, почти без ничего вокруг. Маленькая строка фактов и кнопка внизу. Смело, громко.",
    props: z.object({ kicker: z.string().optional(), headline: text, facts: z.array(text).max(4), cta: CtaSchema }),
    css: `.hp h1{font-size:clamp(2.6rem,min(13vw,var(--fit,13vw),var(--fit-h,14vh)),13rem);line-height:.88;overflow-wrap:anywhere}
.hp .kick{margin-bottom:2rem}
.hp .bot{display:flex;justify-content:space-between;align-items:end;gap:2rem;margin-top:clamp(2rem,5vw,4rem);border-top:1px solid var(--line);padding-top:1.25rem;flex-wrap:wrap}
.hp ul{list-style:none;display:flex;gap:2rem;padding:0;margin:0;flex-wrap:wrap;font-size:.95rem}`,
    render: (p) => (
      <section className="sec hp">
        <div className="wrap">
          {p.kicker && <p className="lbl kick">{p.kicker}</p>}
          <h1 style={fitHeadline(p.headline, 1)}>{p.headline}</h1>
          <div className="bot">
            <ul>{p.facts.map((f) => <li key={f}>{f}</li>)}</ul>
            <Button cta={p.cta} />
          </div>
        </div>
      </section>
    ),
  }),
  "hero.statement": defineComposition({
    description: "Тихий главный экран: короткое утверждение умеренного размера, пояснение отдельно в detail, без фото, много воздуха. Подходит, когда важно спокойно прочитать предложение. Не превращать h1 в длинное определение услуги.",
    props: z.object({ statement: text, detail: z.string().optional(), cta: CtaSchema.optional(), align: z.enum(["left", "center"]) }),
    css: `.hst .st{font-family:var(--f-display);font-weight:var(--d-weight);font-style:var(--d-style);font-size:clamp(1.9rem,4.2vw,3.6rem);line-height:1.18;max-width:20em;letter-spacing:var(--d-track)}
.hst.center{text-align:center}.hst.center .st,.hst.center .lead{margin-left:auto;margin-right:auto}
.hst .lead{margin-top:2rem}
.hst .btn{margin-top:2.5rem}`,
    render: (p) => (
      <section className={`sec hst ${p.align}`}>
        <div className="wrap">
          <h1 className="st">{p.statement}</h1>
          {p.detail && <p className="lead muted">{p.detail}</p>}
          <Button cta={p.cta} />
        </div>
      </section>
    ),
  }),
  "hero.full-photo": defineComposition({
    description: "Фото на всю ширину экрана, заголовок поверх в нижней части. Для бизнеса, где место или атмосфера и есть главное.",
    props: z.object({ headline: text, sub: z.string().optional(), cta: CtaSchema, photo: PhotoSchema }),
    css: `.hf{position:relative;min-height:min(88vh,52rem);display:flex;align-items:flex-end}
.hf .ph{position:absolute;inset:0;border-radius:0;height:100%}
.hf .in{position:relative;padding-block:3rem;width:100%}
.hf .box{background:var(--bg);padding:clamp(1.25rem,3vw,2.5rem);max-width:44rem;border-radius:var(--radius)}
.hf .lead{margin:1rem 0 1.5rem}`,
    render: (p) => (
      <section className="hf">
        <PhotoSlot photo={p.photo} ratio="auto" />
        <div className="wrap in">
          <div className="box">
            <h1 style={fitHeadline(p.headline, 0.6)}>{p.headline}</h1>
            {p.sub && <p className="lead muted">{p.sub}</p>}
            <Button cta={p.cta} />
          </div>
        </div>
      </section>
    ),
  }),
  "hero.editorial": defineComposition({
    description: "Главный экран с практической справкой: заголовок, пояснение и кнопка занимают две трети, справа компактный список реальных сведений из брифа (дни, время, цена, длительность, часы работы). Фото под ними необязательно. Подходит, когда посетителю важны конкретные условия основного предложения.",
    props: z.object({
      headline: text,
      sub: text,
      details: z.array(z.object({ term: text, value: text })).min(2).max(5),
      cta: CtaSchema.optional(),
      photo: PhotoSchema.optional(),
    }),
    css: `.he .top{display:grid;grid-template-columns:2fr 1fr;gap:clamp(2rem,4vw,4rem);align-items:start}
.he dl{margin:.5rem 0 0;display:grid;grid-template-columns:auto 1fr;gap:.5rem 1.25rem;font-size:.95rem}
.he dt{color:var(--muted)}.he dd{margin:0}
.he .lead{margin-top:1.25rem;max-width:34em}
.he .btn{margin-top:1.75rem}
.he .ph{margin-top:clamp(2.5rem,5vw,4.5rem)}
@media(max-width:760px){.he .top{grid-template-columns:1fr}}`,
    render: (p) => (
      <section className="sec he">
        <div className="wrap">
          <div className="top">
            {/* Заголовок, описание и кнопка вместе: кнопка видна без прокрутки. Сведения справа. */}
            <div>
              <h1 style={fitHeadline(p.headline, 0.66)}>{p.headline}</h1>
              <p className="lead muted">{p.sub}</p>
              <Button cta={p.cta} />
            </div>
            <dl>{p.details.map((d) => [<dt key={d.term + "t"}>{d.term}</dt>, <dd key={d.term + "d"}>{d.value}</dd>])}</dl>
          </div>
          {p.photo && <PhotoSlot photo={p.photo} ratio="21 / 8" />}
        </div>
      </section>
    ),
  }),
  "hero.band": defineComposition({
    description: "Заголовок крупно на сплошной цветной полосе во всю ширину (цвет accent), под ней ряд из двух-трёх фото и короткая строка фактов. Энергично, как вывеска или плакат.",
    props: z.object({ headline: text, sub: z.string().optional(), cta: CtaSchema, photos: z.array(PhotoSchema).min(2).max(3), facts: z.array(text).max(4) }),
    css: `.hb .band{background:var(--accent);color:var(--accent-ink);padding:clamp(3rem,8vw,7rem) 0}
.hb h1{font-size:clamp(2.4rem,min(9vw,var(--fit,9vw),var(--fit-h,14vh)),8rem);line-height:.92;max-width:14em}
.hb .lead{margin-top:1.5rem;opacity:.9}.hb .band .btn{margin-top:2rem;background:var(--accent-ink);color:var(--accent)}
.hb .ph-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:.75rem;margin-top:.75rem}
.hb ul{list-style:none;display:flex;flex-wrap:wrap;gap:1rem 2.5rem;padding:1.25rem 0 0;margin:0;font-size:.95rem}`,
    render: (p) => (
      <section className="hb">
        <div className="band"><div className="wrap"><h1 style={fitHeadline(p.headline, 0.9)}>{p.headline}</h1>{p.sub && <p className="lead">{p.sub}</p>}<Button cta={p.cta} /></div></div>
        <div className="wrap">
          <div className="ph-row">{p.photos.map((ph) => <PhotoSlot key={ph.subject} photo={ph} ratio="4 / 3" />)}</div>
          {p.facts.length > 0 && <ul>{p.facts.map((f) => <li key={f}>{f}</li>)}</ul>}
        </div>
      </section>
    ),
  }),
  "hero.offset-photo": defineComposition({
    description: "Большое фото слева сверху, заголовок справа снизу заходит на край фото, как в журнальной обложке. Для бизнеса, где важно место или люди, но нужен характер, а не стандартные две колонки.",
    props: z.object({ headline: text, sub: text, cta: CtaSchema, photo: PhotoSchema }),
    css: `.ho .grid{display:grid;grid-template-columns:repeat(12,1fr);align-items:end}
.ho .ph{grid-column:1/9;grid-row:1}
.ho .txt{grid-column:7/13;grid-row:1;background:var(--bg);padding:clamp(1.25rem,3vw,2.5rem);margin-bottom:-2rem;position:relative;border-radius:var(--radius)}
.ho .lead{margin:1rem 0 1.5rem}
@media(max-width:760px){.ho .grid{display:block}.ho .txt{margin:-3rem 1rem 0}}`,
    render: (p) => (
      <section className="sec ho">
        <div className="wrap grid">
          <PhotoSlot photo={p.photo} ratio="5 / 4" />
          <div className="txt"><h1 style={fitHeadline(p.headline, 0.5)}>{p.headline}</h1><p className="lead muted">{p.sub}</p><Button cta={p.cta} /></div>
        </div>
      </section>
    ),
  }),
};
