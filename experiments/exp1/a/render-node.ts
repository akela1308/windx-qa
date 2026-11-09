import { renderToStaticMarkup } from "react-dom/server";
import type { SiteDoc } from "./schema";
import { renderDocWith } from "./render";

// Рендер для скриптов эксперимента (вне Next.js).
export function renderDoc(doc: SiteDoc): string {
  return renderDocWith(doc, renderToStaticMarkup);
}
