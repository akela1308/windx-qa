import type { ReactElement } from "react";
import { COMPOSITIONS, type SiteDoc } from "./schema";
import { baseCss } from "./parts";
import { googleFontsHref } from "./fonts";
import { tokensToCss } from "./tokens";
import type { RenderCtx } from "./registry";

// Документ подхода A в самостоятельную HTML-страницу.
// CSS собирается только из тех композиций, что реально использованы.
// toMarkup передаётся снаружи (renderToStaticMarkup из react-dom/server):
// так этот файл можно подключать и в скрипты, и в Next.js, где прямой импорт запрещён.
export function renderDocWith(doc: SiteDoc, toMarkup: (el: ReactElement) => string, enquiry?: RenderCtx["enquiry"]): string {
  const used = [...new Set(doc.sections.map((s) => s.composition))];
  const css = [tokensToCss(doc.tokens), baseCss, ...used.map((k) => COMPOSITIONS[k].css)].join("\n");
  const fonts = googleFontsHref([doc.tokens.displayFont, doc.tokens.bodyFont, "caveat"]);

  let index = 0;
  const body = doc.sections.map((s, i) => {
    const comp = COMPOSITIONS[s.composition];
    // Номер метки считаем только у содержательных секций.
    if (!/^(header|footer|signature)\./.test(s.composition)) index++;
    const node = comp.render(s.props as never, { tokens: doc.tokens, index, sectionIndex: i, enquiry });
    return (
      <div key={i} className={`tone-${s.tone}`} id={s.id} data-section={s.composition}>
        {node}
      </div>
    );
  });

  const html = toMarkup(<main>{body}</main>);
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(doc.meta.title)}</title>
<meta name="description" content="${escape(doc.meta.description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fonts}">
<style>${css}</style>
</head>
<body>${html}</body>
</html>`;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
