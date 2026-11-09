import type { CSSProperties } from "react";
import { z } from "zod";
import {
  PublishedCanvasSchema,
  type Element,
} from "../../../../src/lib/free-editor/model";
import { defineComposition } from "../registry";

const fonts = {
  sans: "Arial, sans-serif",
  serif: "Georgia, serif",
  mono: "'Courier New', monospace",
};
function element(e: Element) {
  if (e.type === "shape")
    return (
      <div
        aria-hidden="true"
        className="wfb-fill"
        style={{ background: e.fill }}
      />
    );
  let node;
  if (e.type === "image") {
    node = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="wfb-image"
        src={e.src}
        alt={e.alt}
        style={{ objectFit: e.fit }}
      />
    );
  } else {
    const Tag = e.tag;
    node = (
      <Tag
        className="wfb-text"
        style={{
          fontFamily: fonts[e.style.font],
          fontWeight: e.style.weight,
          lineHeight: e.style.lineHeight,
          color: e.style.colour,
          textAlign: e.style.align,
        }}
      >
        {e.text}
      </Tag>
    );
  }
  return e.href ? (
    <a className="wfb-link" href={e.href}>
      {node}
    </a>
  ) : (
    node
  );
}
export const free = {
  "free.canvas": defineComposition({
    description:
      "Owner's manually edited free canvas. Preserve it exactly; editing is in the visual editor.",
    props: z.object({ canvas: PublishedCanvasSchema }),
    css: `.wfb{width:min(100%,1120px);margin-inline:auto;container-type:inline-size;background:var(--free-bg);color-scheme:light}.wfb-stage{--base:1120;--fh:var(--hd);height:calc(var(--fh)*100cqw/var(--base));position:relative}.wfb-element{--x:var(--xd);--y:var(--yd);--w:var(--wd);--h:var(--ed);--font:var(--fd);position:absolute;left:calc(var(--x)*100%/var(--base));top:calc(var(--y)*100cqw/var(--base));width:calc(var(--w)*100%/var(--base));height:calc(var(--h)*100cqw/var(--base));border-radius:calc(var(--radius)*100cqw/var(--base))}.wfb-fill,.wfb-image,.wfb-link{display:block;width:100%;height:100%;border-radius:inherit}.wfb-text{margin:0;letter-spacing:normal;text-transform:none;font-style:normal;min-height:100%;box-sizing:border-box;white-space:pre-wrap;overflow-wrap:anywhere;font-size:calc(var(--font)*100cqw/var(--base));padding:calc(var(--padding)*100cqw/var(--base))}.wfb-link{color:inherit;text-decoration:underline}.wfb-link:focus-visible{outline:3px solid currentColor;outline-offset:3px}@media(max-width:760px){.wfb{max-width:760px}.wfb-stage{--base:360;--fh:var(--hp)}.wfb-element{--x:var(--xp);--y:var(--yp);--w:var(--wp);--h:var(--ep);--font:var(--fp)}}`,
    render: ({ canvas: c }) => (
      <section
        className="wfb"
        aria-label={c.title}
        style={{ "--free-bg": c.background } as CSSProperties}
      >
        <div
          className="wfb-stage"
          style={
            {
              "--hd": c.height.desktop,
              "--hp": c.height.phone,
            } as CSSProperties
          }
        >
          {c.elements.map((e) => (
            <div
              key={e.id}
              className="wfb-element"
              data-free-element={e.id}
              style={
                {
                  "--xd": e.desktop.x,
                  "--yd": e.desktop.y,
                  "--wd": e.desktop.width,
                  "--ed": e.desktop.height,
                  "--xp": e.phone.x,
                  "--yp": e.phone.y,
                  "--wp": e.phone.width,
                  "--ep": e.phone.height,
                  "--fd": e.type === "text" ? e.style.size : 0,
                  "--fp": e.type === "text" ? e.phoneSize : 0,
                  "--padding": e.type === "text" ? e.style.padding : 0,
                  "--radius": e.type === "text" ? 0 : e.radius,
                  zIndex: e.layer + 1,
                } as CSSProperties
              }
            >
              {element(e)}
            </div>
          ))}
        </div>
      </section>
    ),
  }),
};
