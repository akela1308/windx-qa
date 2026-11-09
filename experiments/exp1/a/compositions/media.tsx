import { z } from "zod";
import { defineComposition } from "../registry";
import { PhotoSchema, PhotoSlot } from "../parts";

// Отдельное изображение добавляется владельцем без смены соседних композиций.
export const media = {
  "media.image": defineComposition({
    description: "Изображение владельца с необязательной подписью.",
    props: z.object({ photo: PhotoSchema, caption: z.string().max(500).optional(), framing:z.enum(["portrait","landscape","square","wide"]).optional() }),
    css: ".mi{margin-block:0}.mi figcaption{margin-top:.75rem;font-size:.9rem}",
    render: p => <section className="sec"><figure className="wrap mi"><PhotoSlot photo={p.photo} ratio={p.framing==="portrait"?"4 / 5":p.framing==="square"?"1 / 1":p.framing==="wide"?"21 / 9":p.framing==="landscape"?"3 / 2":"16 / 9"} />{p.caption && <figcaption className="muted">{p.caption}</figcaption>}</figure></section>,
  }),
};
