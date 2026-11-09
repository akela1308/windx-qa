import { z } from "zod";
import { defineComposition } from "../registry";
import { Button, CtaSchema, text } from "../parts";

const props = z.object({title:text, intro:text.optional(), items:z.array(z.object({name:text, description:text, cta:CtaSchema.optional()})).min(2).max(6)});
export const serviceLayouts = {
  "services.staggered": defineComposition({
    description: "Услуги без фото как чередующиеся широкие текстовые развороты: название слева и пояснение справа, затем наоборот. Не нумерованный указатель и не сетка карточек. Для 2-4 предложений с разным содержанием, которым нужно место.",
    props: props.extend({items:props.shape.items.max(4)}),
    css: `.sst{overflow-wrap:anywhere}.sst .intro{max-width:38em;margin-top:1rem}.sst .rows{margin-top:2rem}.sst article{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(1.5rem,5vw,5rem);padding:clamp(2rem,5vw,4rem) 0;border-top:1px solid var(--line)}
.sst article:nth-child(even) h3{order:2}.sst h3{font-size:clamp(1.6rem,3.5vw,3rem);max-width:14em}.sst article p{max-width:34em}.sst .btn{margin-top:1.25rem}
@media(max-width:760px){.sst article{grid-template-columns:1fr}.sst article:nth-child(even) h3{order:0}}`,
    render: p=><section className="sec sst"><div className="wrap"><h2>{p.title}</h2>{p.intro&&<p className="lead muted intro">{p.intro}</p>}<div className="rows">{p.items.map(i=><article key={i.name}><h3>{i.name}</h3><div><p className="muted">{i.description}</p><Button cta={i.cta} ghost /></div></article>)}</div></div></section>,
  }),
  "services.disclosure": defineComposition({
    description: "Компактный список раскрывающихся услуг: видны названия, первая открыта, остальные раскрываются нажатием или клавиатурой. Слева короткое введение, справа подробности. Без фото, без JavaScript, без иконок-карточек. Для услуг с объяснениями, которые читатель выбирает сам.",
    props,
    css: `.sds{overflow-wrap:anywhere}.sds .layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.7fr);gap:clamp(2rem,5vw,5rem);align-items:start}.sds .lead{margin-top:1rem}.sds details{border-top:1px solid var(--line);padding:1.25rem 0}.sds details:last-child{border-bottom:1px solid var(--line)}
.sds summary{font-family:var(--f-display);font-weight:var(--d-weight);font-size:clamp(1.2rem,2.5vw,1.8rem);cursor:pointer;overflow-wrap:anywhere}.sds details p{margin-top:1rem;max-width:36em}.sds .btn{margin-top:1.25rem}.sds summary:focus-visible{outline:2px solid currentColor;outline-offset:5px}
@media(max-width:760px){.sds .layout{grid-template-columns:1fr}}`,
    render: p=><section className="sec sds"><div className="wrap layout"><div><h2>{p.title}</h2>{p.intro&&<p className="lead muted">{p.intro}</p>}</div><div>{p.items.map((i,k)=><details key={i.name} open={k===0}><summary>{i.name}</summary><p className="muted">{i.description}</p><Button cta={i.cta} ghost /></details>)}</div></div></section>,
  }),
};
