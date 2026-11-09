// Лист из высоких снимков сайтов рядом, по верхней части: npx tsx scripts/sheet-tall.mts <выход.jpg> <высота-обрезки> <картинки...>
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const [out, crop, ...files] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 330 * files.length, height: 600 } });
const cols = files.map((f) => `<div style="width:320px;height:${crop}px;overflow:hidden"><img src="data:image/jpeg;base64,${readFileSync(f).toString("base64")}" style="width:320px"></div>`).join("");
await p.setContent(`<body style="margin:0;display:flex;gap:10px;background:#888">${cols}</body>`);
await p.screenshot({ path: out, fullPage: true, type: "jpeg", quality: 72 });
await b.close();
