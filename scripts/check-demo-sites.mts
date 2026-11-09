// Проверка демо-сайтов в браузере: рендер, переполнение на телефоне, невидимый текст, снимки.
// Запуск: npx tsx scripts/check-demo-sites.mts <папка-для-снимков>
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderDoc } from "../experiments/exp1/a/render-node";
import { validateDoc } from "../experiments/exp1/a/validate";
import { openBrowser, shoot } from "../experiments/exp1/measure/shoot";

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const dir = "docs/demo-sites/outputs";
const { browser, page } = await openBrowser();
for (const f of readdirSync(dir)) {
  const r = validateDoc(JSON.parse(readFileSync(path.join(dir, f), "utf8")));
  if (!r.ok) { console.log(f, "НЕ ПРОШЁЛ СХЕМУ", r.errors.slice(0, 3)); continue; }
  const html = path.join(out, f.replace(".json", ".html"));
  writeFileSync(html, renderDoc(r.doc));
  const d = await shoot(page, html, html.replace(".html", "-d.jpg"), 1280);
  const m = await shoot(page, html, html.replace(".html", "-m.jpg"), 390);
  const problems = [m.scrollWidth > 391 ? `шире экрана ${m.scrollWidth}px` : "", d.invisibleText.length ? `невидимый текст: ${d.invisibleText.slice(0, 3).join(" | ")}` : ""].filter(Boolean);
  console.log(f, problems.join("; ") || "ok");
}
await browser.close();
