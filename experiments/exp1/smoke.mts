import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { validateDoc } from "./a/validate";
import { renderDoc } from "./a/render-node";
import { probe } from "./measure/page-probe";
const S = process.argv[2];
const r = validateDoc(JSON.parse(readFileSync(`${S}/smoke.json`, "utf8")));
if (!r.ok) { console.log(r.errors); process.exit(1); }
writeFileSync(`${S}/smoke.html`, renderDoc(r.doc));
const b = await chromium.launch(); const p = await b.newPage();
await p.addInitScript(() => ((window as any).__name = (f: any) => f));
for (const w of [1280, 390]) {
  await p.setViewportSize({ width: w, height: 900 });
  await p.goto(`file://${S}/smoke.html`, { waitUntil: "networkidle" });
  await p.screenshot({ path: `${S}/smoke-${w}.jpg`, fullPage: true, type: "jpeg", quality: 60 });
  const pr = await p.evaluate(probe);
  console.log(w, pr.scrollWidth, pr.fonts, JSON.stringify(pr.cardGrids), pr.blocks.map(x => x.kind).join(" → "));
}
await b.close();
