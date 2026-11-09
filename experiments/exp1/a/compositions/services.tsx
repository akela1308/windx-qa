import { z } from "zod";
import { defineComposition } from "../registry";
import { Button, CtaSchema, PhotoSchema, PhotoSlot, text } from "../parts";

const item = z.object({
  name: text,
  description: z.string().optional(),
  price: z.string().optional().describe("Цена, если клиент её назвал; иначе не указывать"),
  duration: z.string().optional(),
});
const base = { title: text, intro: z.string().optional() };

function Head({ p, aside = false }: { p: { title: string; intro?: string }; aside?: boolean }) {
  return (
    <div className={aside ? "sv-head aside" : "sv-head"}>
      <h2>{p.title}</h2>
      {p.intro && <p className="lead muted">{p.intro}</p>}
    </div>
  );
}

const headCss = `.sv-head{margin-bottom:clamp(2rem,4vw,3.5rem)}.sv-head .lead{margin-top:1rem}`;

export const services = {
  "services.ledger": defineComposition({
    description: "Прайс-лист: строки «название ..... цена» с тонкими линиями, описание мелко под названием. Честно и практично, как меню или доска цен в мастерской.",
    props: z.object({ ...base, items: z.array(item).min(2).max(14), note: z.string().optional() }),
    css: `${headCss}.sl ul{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.sl li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.25rem 2rem;padding:1.1rem 0;border-bottom:1px solid var(--line)}
.sl .n{font-weight:600;font-size:1.1rem}.sl .pr{font-variant-numeric:tabular-nums;white-space:nowrap}
.sl .d{grid-column:1/-1;font-size:.95rem;max-width:42em}
.sl .note{margin-top:1.25rem;font-size:.9rem}
@media(max-width:600px){.sl li{grid-template-columns:1fr}.sl .pr{white-space:normal;font-weight:600}}`,
    render: (p) => (
      <section className="sec sl">
        <div className="wrap">
          <Head p={p} />
          <ul>
            {p.items.map((i) => (
              <li key={i.name}>
                <span className="n">{i.name}</span>
                <span className="pr">{[i.duration, i.price].filter(Boolean).join(" · ")}</span>
                {i.description && <span className="d muted">{i.description}</span>}
              </li>
            ))}
          </ul>
          {p.note && <p className="note muted">{p.note}</p>}
        </div>
      </section>
    ),
  }),
  "services.index": defineComposition({
    description: "Крупный нумерованный указатель: каждая услуга отдельной строкой огромным шрифтом с номером, описание справа. Выразительно, мало пунктов (3-6).",
    props: z.object({ ...base, items: z.array(item).min(2).max(6) }),
    css: `${headCss}.si ol{list-style:none;margin:0;padding:0}
.si li{display:grid;grid-template-columns:4rem 1.4fr 1fr;gap:1.5rem;align-items:baseline;padding:clamp(1.25rem,2.5vw,2rem) 0;border-top:1px solid var(--line)}
.si .no{font-variant-numeric:tabular-nums;color:var(--muted)}
.si .n{font-family:var(--f-display);font-weight:var(--d-weight);font-size:clamp(1.8rem,4vw,3.4rem);line-height:1;text-transform:var(--d-case);letter-spacing:var(--d-track);font-style:var(--d-style)}
.si .pr{display:block;margin-top:.5rem;font-weight:600}
@media(max-width:760px){.si li{grid-template-columns:2.5rem 1fr}.si .d{grid-column:2}}`,
    render: (p) => (
      <section className="sec si">
        <div className="wrap">
          <Head p={p} />
          <ol>
            {p.items.map((i, k) => (
              <li key={i.name}>
                <span className="no">{String(k + 1).padStart(2, "0")}</span>
                <span className="n">{i.name}</span>
                <span className="d muted">{i.description}{i.price && <span className="pr">{i.price}</span>}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    ),
  }),
  "services.alternating": defineComposition({
    description: "Чередующиеся ряды: фото слева, текст справа, затем наоборот. Для 2-4 услуг, которые лучше показать, чем перечислить.",
    props: z.object({ ...base, items: z.array(item.extend({ photo: PhotoSchema, cta: CtaSchema.optional() })).min(2).max(4) }),
    css: `${headCss}.sa .row{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,5vw,5rem);align-items:center;margin-top:clamp(2.5rem,5vw,4.5rem)}
.sa .row:nth-child(even) .ph{order:2}
.sa h3{margin-bottom:1rem}.sa .pr{margin-top:1rem;font-weight:600}.sa .btn{margin-top:1.5rem}
@media(max-width:760px){.sa .row{grid-template-columns:1fr}.sa .row:nth-child(even) .ph{order:0}}`,
    render: (p) => (
      <section className="sec sa">
        <div className="wrap">
          <Head p={p} />
          <div>
            {p.items.map((i) => (
              <div className="row" key={i.name}>
                <PhotoSlot photo={i.photo} />
                <div>
                  <h3>{i.name}</h3>
                  {i.description && <p className="muted">{i.description}</p>}
                  {i.price && <p className="pr">{i.price}</p>}
                  <Button cta={i.cta} ghost />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
  }),
  "services.feature-plus-list": defineComposition({
    description: "Одна главная услуга крупно (с фото и подробным описанием), остальные коротким списком сбоку. Когда у бизнеса есть основная услуга и дополнительные.",
    props: z.object({
      ...base,
      featured: item.extend({ photo: PhotoSchema.optional(), cta: CtaSchema.optional() }),
      others: z.array(item).min(1).max(8),
      othersTitle: z.string().optional(),
    }),
    css: `${headCss}.sf .grid{display:grid;grid-template-columns:1.5fr 1fr;gap:clamp(2rem,5vw,5rem)}
.sf .ft h3{font-size:clamp(1.6rem,3vw,2.4rem);margin:1.5rem 0 1rem}.sf .ft .pr{font-weight:600;margin-top:1rem}.sf .ft .btn{margin-top:1.5rem}
.sf .ot h4{margin:0 0 1rem;font-family:var(--f-display);font-size:1.1rem;font-weight:var(--d-weight)}
.sf .ot ul{list-style:none;margin:0;padding:0}
.sf .ot li{padding:.9rem 0;border-top:1px solid var(--line)}
.sf .ot .n{display:flex;justify-content:space-between;gap:1rem;font-weight:600}
.sf .ot .d{font-size:.92rem;margin-top:.25rem}
@media(max-width:760px){.sf .grid{grid-template-columns:1fr}}`,
    render: (p) => (
      <section className="sec sf">
        <div className="wrap">
          <Head p={p} />
          <div className="grid">
            <div className="ft">
              {p.featured.photo && <PhotoSlot photo={p.featured.photo} ratio="3 / 2" />}
              <h3>{p.featured.name}</h3>
              {p.featured.description && <p className="muted">{p.featured.description}</p>}
              {p.featured.price && <p className="pr">{p.featured.price}</p>}
              <Button cta={p.featured.cta} />
            </div>
            <div className="ot">
              {p.othersTitle && <h4>{p.othersTitle}</h4>}
              <ul>
                {p.others.map((i) => (
                  <li key={i.name}>
                    <span className="n"><span>{i.name}</span>{i.price && <span>{i.price}</span>}</span>
                    {i.description && <p className="d muted">{i.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    ),
  }),
  "services.prose-columns": defineComposition({
    description: "Заголовок секции слева в узкой колонке, справа услуги как абзацы текста: жирное название и описание, разделены линиями. Без рамок и иконок. Спокойно и серьёзно, для услуг, которые надо объяснять.",
    props: z.object({ ...base, items: z.array(item).min(2).max(8) }),
    css: `.sp .grid{display:grid;grid-template-columns:1fr 2fr;gap:clamp(2rem,5vw,5rem)}
.sp .sv-head{position:sticky;top:2rem;align-self:start}
.sp .sv-head .lead{margin-top:1rem;font-size:1rem}
.sp article{padding:1.5rem 0;border-top:1px solid var(--line)}
.sp article h3{margin-bottom:.6rem}
.sp .meta{margin-top:.6rem;font-size:.9rem;font-weight:600}
@media(max-width:760px){.sp .grid{grid-template-columns:1fr}.sp .sv-head{position:static}}`,
    render: (p) => (
      <section className="sec sp">
        <div className="wrap grid">
          <Head p={p} aside />
          <div>
            {p.items.map((i) => (
              <article key={i.name}>
                <h3>{i.name}</h3>
                {i.description && <p className="muted">{i.description}</p>}
                {(i.price || i.duration) && <p className="meta">{[i.duration, i.price].filter(Boolean).join(" · ")}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>
    ),
  }),
  "services.table": defineComposition({
    description: "Таблица с колонками: услуга, что входит, длительность, цена. Для бизнеса с похожими пакетами, которые удобно сравнить.",
    props: z.object({ ...base, columns: z.tuple([text, text, text, text]).describe("Подписи четырёх колонок"), items: z.array(item).min(2).max(10) }),
    css: `${headCss}.st .tw{overflow-x:auto}
.st table{width:100%;border-collapse:collapse;font-size:.98rem;min-width:36rem}
.st th{text-align:left;font-weight:500;font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:.75rem 1rem .75rem 0;border-bottom:2px solid var(--ink)}
.st td{padding:1.1rem 1rem 1.1rem 0;border-bottom:1px solid var(--line);vertical-align:top}
.st td:first-child{font-weight:600}.st td:last-child{white-space:nowrap;font-variant-numeric:tabular-nums}`,
    render: (p) => (
      <section className="sec st">
        <div className="wrap">
          <Head p={p} />
          <div className="tw">
            <table>
              <thead><tr>{p.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {p.items.map((i) => (
                  <tr key={i.name}><td>{i.name}</td><td className="muted">{i.description}</td><td>{i.duration}</td><td>{i.price}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    ),
  }),
  "services.cards": defineComposition({
    description: "Сетка карточек с иконкой, заголовком и текстом. ТОЛЬКО если клиент прямо попросил карточки. По умолчанию не использовать.",
    props: z.object({ ...base, items: z.array(item.extend({ glyph: z.string().max(2).describe("Символ или эмодзи для иконки") })).min(3).max(9) }),
    css: `${headCss}.sc .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));gap:1.25rem}
.sc .card{border:1px solid var(--line);border-radius:var(--radius);padding:1.75rem;background:var(--bg)}
.sc .ic{width:2.75rem;height:2.75rem;border-radius:calc(var(--radius) * .6);background:color-mix(in srgb,var(--accent) 18%,transparent);display:grid;place-items:center;margin-bottom:1.25rem}
.sc h3{margin-bottom:.5rem}`,
    render: (p) => (
      <section className="sec sc">
        <div className="wrap">
          <Head p={p} />
          <div className="grid">
            {p.items.map((i) => (
              <div className="card" key={i.name}>
                <div className="ic">{i.glyph}</div>
                <h3>{i.name}</h3>
                {i.description && <p className="muted">{i.description}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
  }),
  "services.cta-band": defineComposition({
    description: "Не список услуг, а короткая полоса призыва: одна фраза и кнопка. Ставится между секциями.",
    props: z.object({ line: text, cta: CtaSchema }),
    css: `.sb .in{display:flex;justify-content:space-between;align-items:center;gap:2rem;flex-wrap:wrap}
.sb p{font-family:var(--f-display);font-weight:var(--d-weight);font-style:var(--d-style);font-size:clamp(1.5rem,3vw,2.4rem);line-height:1.15;max-width:22em;text-transform:var(--d-case);letter-spacing:var(--d-track)}`,
    render: (p) => (
      <section className="sec sb">
        <div className="wrap in"><p>{p.line}</p><Button cta={p.cta} /></div>
      </section>
    ),
  }),
};
