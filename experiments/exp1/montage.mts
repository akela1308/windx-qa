// Листы для просмотра глазами: все шаги одного бизнеса рядом, по всей высоте.
// Запуск: npx tsx experiments/exp1/montage.mts <папка-для-листов>
import { chromium } from "playwright";
import path from "node:path";
import { readFileSync } from "node:fs";
const ROOT = path.join(process.cwd(), "docs/experiment-1/screenshots");
const out = process.argv[2];
const steps = ["gen1", "gen2", "edit1", "edit2", "edit3"];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 800 } });
for (const a of ["A", "B"]) for (const biz of ["bike", "law", "yoga"]) {
  const cols = steps.map((s) => `<div><b>${a} ${biz} ${s}</b><img src="data:image/jpeg;base64,${readFileSync(`${ROOT}/${a}/${biz}/${s}-desktop.jpg`).toString("base64")}"></div>`).join("");
  await p.setContent(`<style>body{margin:0;display:flex;gap:8px;font:14px system-ui;align-items:flex-start}div{width:292px}img{width:292px;display:block}</style>${cols}`);
  await p.waitForLoadState("load");
  await p.screenshot({ path: `${out}/${a}-${biz}.jpg`, fullPage: true, type: "jpeg", quality: 70 });
}
await b.close();
