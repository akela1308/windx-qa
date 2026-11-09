// Проверка первого экрана: помещается ли заголовок и видна ли кнопка без прокрутки.
// Размеры: превью в редакторе (900×600), ноутбук (1280×720), телефон (390×844).
// Запуск: npx tsx scripts/check-first-screen.mts <папка-для-снимков>
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { renderDoc } from "../experiments/exp1/a/render-node";
import type { SiteDoc } from "../experiments/exp1/a/schema";
import { validateDoc } from "../experiments/exp1/a/validate";

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const files = [
  ...readdirSync("docs/demo-sites/outputs").map((f) => path.join("docs/demo-sites/outputs", f)),
  ...["bike", "law", "yoga"].flatMap((b) => ["light", "dark", "colour"].map((v) => `docs/experiment-1c/outputs/${b}/${v}.json`)),
];
// Худший случай из жалобы: длинная фраза в «афише».
const LONG = "Solicitors for London homes, jobs and families, with fixed fees and plain answers.";

const docs: [string, SiteDoc][] = [];
for (const f of files) {
  const r = validateDoc(JSON.parse(readFileSync(f, "utf8")));
  if (!r.ok) { console.log(f, "НЕ ПРОШЁЛ СХЕМУ"); continue; }
  const name = f.replace(/^docs\//, "").replace(/\//g, "_").replace(".json", "");
  docs.push([name, r.doc]);
  const hero = r.doc.sections.find((s) => s.composition.startsWith("hero."));
  if (hero && "headline" in (hero.props as object)) {
    const long = structuredClone(r.doc);
    (long.sections.find((s) => s.composition.startsWith("hero."))!.props as { headline: string }).headline = LONG;
    docs.push([`${name}__LONG`, long]);
  }
}

const b = await chromium.launch();
let bad = 0;
for (const [name, doc] of docs) {
  const html = path.resolve(out, `${name}.html`);
  writeFileSync(html, renderDoc(doc));
  const problems: string[] = [];
  let kind = "";
  for (const [w, h] of [[900, 600], [1280, 720], [390, 844]] as const) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto("file://" + html);
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const hero = [...document.querySelectorAll<HTMLElement>("[data-section]")].find((s) => s.dataset.section!.startsWith("hero."));
      const h1 = hero?.querySelector("h1");
      const btn = hero?.querySelector<HTMLElement>(".btn");
      const lh = h1 ? parseFloat(getComputedStyle(h1).lineHeight) || parseFloat(getComputedStyle(h1).fontSize) : 1;
      return {
        h1Bottom: h1 ? h1.getBoundingClientRect().bottom : 0,
        lines: h1 ? Math.round(h1.getBoundingClientRect().height / lh) : 0,
        btnBottom: btn ? btn.getBoundingClientRect().bottom : null,
        kind: hero?.dataset.section,
      };
    });
    kind = r.kind ?? "";
    // На телефоне допускаем, что кнопка чуть ниже: главное, заголовок целиком.
    if (r.h1Bottom > h) problems.push(`${w}: заголовок не влез (${r.lines} строк)`);
    else if (w !== 390 && r.btnBottom !== null && r.btnBottom > h) problems.push(`${w}: кнопка за экраном`);
    if (name.endsWith("__LONG") && w === 900) await p.screenshot({ path: path.join(out, `${name}.png`) });
    await p.close();
  }
  if (problems.length) bad++;
  console.log(problems.length ? "ПЛОХО" : "ok   ", name, kind, problems.join("; "));
}
await b.close();
console.log(bad ? `\nПроблем: ${bad}` : "\nВсе первые экраны помещаются");
