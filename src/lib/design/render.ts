import { createRequire } from "node:module";
import type { renderToStaticMarkup as RenderFn } from "react-dom/server";
import type { SiteDoc } from "./index";
import { renderDocWith } from "../../../experiments/exp1/a/render";
import type { RenderCtx } from "../../../experiments/exp1/a/registry";
import { ENQUIRY_SCRIPT } from "@/lib/enquiries/browser";

// Рендер документа сайта в HTML. Используется только обработчиком превью.
// Next.js запрещает import "react-dom/server" в серверном коде приложения,
// поэтому загружаем его в момент вызова через require, мимо сборщика.
// Сайт клиента это статичная страница без интерактивности React, так что это безопасно.
const nodeRequire = createRequire(import.meta.url);

export function renderDoc(doc: SiteDoc, enquiry?: RenderCtx["enquiry"]): string {
  const { renderToStaticMarkup } = nodeRequire("react-dom/server") as { renderToStaticMarkup: typeof RenderFn };
  const html = renderDocWith(doc, renderToStaticMarkup, enquiry);
  return enquiry?.recipientReady ? html.replace("</body>", `${ENQUIRY_SCRIPT}</body>`) : html;
}
