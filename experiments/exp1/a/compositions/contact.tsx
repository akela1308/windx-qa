import { z } from "zod";
import { defineComposition } from "../registry";
import { Button, CtaSchema, PhotoSchema, PhotoSlot, text } from "../parts";

const hours = z.array(z.object({ days: text, time: text })).max(7);
const base = { title: text };
const channels = { phone: z.string().optional(), email: z.string().optional() };

// Контакты не зависят от главной кнопки. Для старых документов читаем
// отсутствующий контакт из cta, чтобы смена схемы не ломала готовые сайты.
function ContactLinks({ phone, email, cta, className = "contact-links" }: {
  phone?: string; email?: string; cta?: z.infer<typeof CtaSchema>; className?: string;
}) {
  const tel = phone?.trim() || (cta?.href.startsWith("tel:") ? cta.href.slice(4) : "");
  const mail = email?.trim() || (cta?.href.startsWith("mailto:") ? cta.href.slice(7).split("?")[0] : "");
  if (!tel && !mail) return null;
  return <div className={className}>
    {tel && <a href={`tel:${tel.replace(/[^\d+]/g, "")}`}>{tel}</a>}
    {mail && <a href={`mailto:${mail}`}>{mail}</a>}
  </div>;
}

function Hours({ rows }: { rows: z.infer<typeof hours> }) {
  return (
    <table className="hrs">
      <tbody>{rows.map((r) => <tr key={r.days}><td>{r.days}</td><td>{r.time}</td></tr>)}</tbody>
    </table>
  );
}
const linksCss = `.contact-links{display:flex;flex-direction:column;gap:.5rem;overflow-wrap:anywhere}.contact-links a{max-width:100%}`;
const hoursCss = `${linksCss}.hrs{border-collapse:collapse;width:100%;max-width:24rem}.hrs td{padding:.45rem 0;border-bottom:1px solid var(--line)}.hrs td:last-child{text-align:right;font-variant-numeric:tabular-nums}`;

export const contact = {
  "contact.big-type": defineComposition({
    description: "Контакты огромным шрифтом: телефон и почта как заголовки, под ними адрес и часы мелко. Для бизнеса, которому звонят.",
    props: z.object({ ...base, ...channels, address: text, hours }),
    css: `${hoursCss}.cb h2{margin-bottom:2rem}
.cb .big a{display:block;font-family:var(--f-display);font-weight:var(--d-weight);font-size:clamp(2rem,6vw,5rem);line-height:1.05;text-decoration:none;overflow-wrap:anywhere;letter-spacing:var(--d-track)}
.cb .row{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--line)}
@media(max-width:760px){.cb .row{grid-template-columns:1fr}}`,
    render: (p) => (
      <section className="sec cb">
        <div className="wrap">
          <h2>{p.title}</h2>
          <ContactLinks {...p} className="big" />
          <div className="row"><p>{p.address}</p><Hours rows={p.hours} /></div>
        </div>
      </section>
    ),
  }),
  "contact.split": defineComposition({
    description: "Две колонки: адрес, часы и как добраться словами слева; справа фото входа с улицы, чтобы человек узнал место, когда придёт.",
    props: z.object({ ...base, ...channels, address: text, directions: z.string().optional(), hours, cta: CtaSchema.optional(), entrance: PhotoSchema.optional().describe("Фото входа с улицы") }),
    css: `${hoursCss}.cs .grid{display:grid;grid-template-columns:1fr 1.3fr;gap:clamp(2rem,5vw,5rem)}
.cs h2{margin-bottom:1.5rem}.cs .ad{font-size:1.2rem;margin-bottom:1rem}.cs .contact-links{margin-top:1rem}.cs .hrs{margin-top:1.5rem}.cs .btn{margin-top:1.5rem}
@media(max-width:760px){.cs .grid{grid-template-columns:1fr}}`,
    render: (p) => (
      <section className="sec cs">
        <div className="wrap grid">
          <div>
            <h2>{p.title}</h2>
            <p className="ad">{p.address}</p>
            {p.directions && <p className="muted">{p.directions}</p>}
            <ContactLinks {...p} />
            <Hours rows={p.hours} />
            <Button cta={p.cta} />
          </div>
          {p.entrance && <PhotoSlot photo={p.entrance} ratio="4 / 5" />}
        </div>
      </section>
    ),
  }),
  "contact.band": defineComposition({
    description: "Короткая контактная полоса: одна фраза-приглашение, телефон и кнопка в одну строку. Хорошо смотрится с tone accent или ink.",
    props: z.object({ line: text, ...channels, cta: CtaSchema }),
    css: `${linksCss}.cbd .in{display:flex;flex-wrap:wrap;gap:1.5rem 3rem;align-items:center;justify-content:space-between}
.cbd p{font-family:var(--f-display);font-weight:var(--d-weight);font-style:var(--d-style);font-size:clamp(1.6rem,3.4vw,2.8rem);line-height:1.1;max-width:18em;text-transform:var(--d-case);letter-spacing:var(--d-track)}
.cbd .r{display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap}`,
    render: (p) => (
      <section className="sec cbd">
        <div className="wrap in"><p>{p.line}</p><div className="r"><ContactLinks {...p} /><Button cta={p.cta} /></div></div>
      </section>
    ),
  }),
};
