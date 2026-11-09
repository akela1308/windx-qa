// Создаёт сайт через кабинет (настоящая модель, если есть ключ) и печатает время и стоимость.
// Запуск: npx tsx scripts/live-create.mts "<описание бизнеса>" [стиль]
import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const [brief, style] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`http://localhost:3000/${style ? `?style=${style}` : ""}#create`);
await p.fill("textarea[name=brief]", brief);
const t0 = Date.now();
await p.getByRole("button", { name: "Create my site" }).click();
await p.waitForURL(/\/sites\//, { timeout: 240_000 });
const id = new URL(p.url()).pathname.split("/").pop()!;
const v = JSON.parse(await readFile(path.join("data/sites", id, "versions/1.json"), "utf8"));
console.log(JSON.stringify({ id, seconds: Math.round((Date.now() - t0) / 1000), name: v.doc.meta.businessName, demo: v.demo, usd: v.usage.costUsd, tokens: [v.usage.inputTokens, v.usage.outputTokens] }));
await b.close();
