import { z } from "zod";
import { defineComposition } from "../registry";
import { Button, CtaSchema, PhotoSchema, PhotoSlot, text } from "../parts";

const intro = {
  kicker: text.max(120).optional(),
  headline: text.max(90),
  sub: text.max(400),
  cta: CtaSchema,
  photo: PhotoSchema,
  caption: text.max(200).optional(),
};
export const heroImages = {
  "hero.image-led": defineComposition({
    description:
      "Главный экран с настоящим изображением под компактным вступлением: умеренный заголовок слева, пояснение и кнопка справа, затем широкое фото на всю ширину. Для предмета, места или работы, которые надо увидеть. Нужен доступный src из материалов владельца; без него выбрать завершённую композицию без фото.",
    props: z.object({ ...intro, framing: z.enum(["landscape", "wide"]) }),
    css: `.hil .intro{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:clamp(1.5rem,4vw,4rem);align-items:end;margin-bottom:2rem}.hil .kicker{margin-bottom:1rem;font-size:.85rem}.hil h1{font-size:clamp(2rem,4.7vw,4.6rem);line-height:1.05;max-width:15ch;overflow-wrap:anywhere}.hil .lead{max-width:35em;font-size:clamp(1rem,1.35vw,1.2rem)}.hil .btn{margin-top:1.25rem}.hil figure{margin:0}.hil figcaption{font-size:.85rem;margin-top:.75rem;color:var(--muted)}
@media(max-width:760px){.hil .intro{grid-template-columns:1fr;gap:1.1rem}.hil h1{font-size:clamp(2rem,8.5vw,3.2rem);max-width:18ch}.hil .ph{aspect-ratio:4/3!important}.hil .btn{margin-top:1rem}}`,
    render: (p) => (
      <section className="sec hil">
        <div className="wrap">
          <div className="intro">
            <div>
              {p.kicker && <p className="kicker">{p.kicker}</p>}
              <h1>{p.headline}</h1>
            </div>
            <div>
              <p className="lead muted">{p.sub}</p>
              <Button cta={p.cta} />
            </div>
          </div>
          <figure>
            <PhotoSlot
              photo={p.photo}
              ratio={p.framing === "wide" ? "21 / 9" : "3 / 2"}
            />
            {p.caption && <figcaption>{p.caption}</figcaption>}
          </figure>
        </div>
      </section>
    ),
  }),
  "hero.portrait-intro": defineComposition({
    description:
      "Введение через человека: узкий вертикальный портрет с подписью занимает треть ширины, рядом умеренный заголовок, пояснение, кнопка и короткая строка реальных сведений. Фото не заполняет половину страницы, заголовок не афиша. Для автора, спикера или специалиста при наличии настоящего переданного портрета. На телефоне текст и действие идут до портрета.",
    props: z.object({ ...intro, facts: z.array(text.max(100)).max(3) }),
    css: `.hpi .layout{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,1.4fr);gap:clamp(2rem,6vw,6rem);align-items:center}.hpi figure{margin:0;max-width:26rem}.hpi .ph{border-radius:var(--radius);max-height:33rem}.hpi figcaption{font-size:.85rem;color:var(--muted);margin-top:.8rem}.hpi .kicker{font-size:.85rem;margin-bottom:1.5rem}.hpi h1{font-size:clamp(2rem,4.6vw,4.6rem);line-height:1.06;max-width:17ch;overflow-wrap:anywhere}.hpi .lead{margin:1.5rem 0;max-width:32em}.hpi ul{list-style:none;padding:1.25rem 0 0;margin:2rem 0 0;display:flex;flex-wrap:wrap;gap:.75rem 1.5rem;border-top:1px solid var(--line);font-size:.85rem}.hpi .copy{min-width:0}
@media(max-width:760px){.hpi .layout{display:flex;flex-direction:column;align-items:stretch;gap:2rem}.hpi .copy{order:-1}.hpi h1{font-size:clamp(2rem,8.8vw,3.2rem);max-width:18ch}.hpi figure{max-width:22rem;width:100%;align-self:center}.hpi .lead{margin:1rem 0}.hpi ul{margin-top:1.5rem}}`,
    render: (p) => (
      <section className="sec hpi">
        <div className="wrap layout">
          <figure>
            <PhotoSlot photo={p.photo} ratio="4 / 5" />
            {p.caption && <figcaption>{p.caption}</figcaption>}
          </figure>
          <div className="copy">
            {p.kicker && <p className="kicker">{p.kicker}</p>}
            <h1>{p.headline}</h1>
            <p className="lead muted">{p.sub}</p>
            <Button cta={p.cta} />
            {p.facts.length > 0 && (
              <ul>
                {p.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    ),
  }),
};
