import { chromium } from "playwright";
import { readFileSync } from "node:fs";
// Листы для просмотра глазами: npx tsx experiments/exp1b/montage.mts <папка>
const R = `${process.cwd()}/docs/experiment-1b/screenshots`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1250, height: 800 } });
for (const biz of ["bike", "law", "yoga"]) {
  const cols = ["light", "dark", "colour", "repeat"].map((s) => `<div><b>${biz} ${s}</b><img src="data:image/jpeg;base64,${readFileSync(`${R}/${biz}/${s}-desktop.jpg`).toString("base64")}"></div>`).join("");
  await p.setContent(`<style>body{margin:0;display:flex;gap:8px;font:14px system-ui;align-items:flex-start}div{width:304px}img{width:304px;display:block}</style>${cols}`);
  await p.screenshot({ path: `${process.argv[2]}/1b-${biz}.jpg`, fullPage: true, type: "jpeg", quality: 70 });
}
await b.close();
