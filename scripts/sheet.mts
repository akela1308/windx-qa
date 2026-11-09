// Склеивает картинки в один лист: npx tsx scripts/sheet.mts <выход.jpg> <ширина-колонки> <картинки...>
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const [out, col, ...files] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: (Number(col) + 8) * Math.min(files.length, 4), height: 600 } });
const imgs = files.map((f) => `<img src="data:image/png;base64,${readFileSync(f).toString("base64")}" style="width:${col}px">`).join("");
await p.setContent(`<body style="margin:0;display:flex;flex-wrap:wrap;gap:8px;background:#888">${imgs}</body>`);
await p.screenshot({ path: out, fullPage: true, type: "jpeg", quality: 75 });
await b.close();
