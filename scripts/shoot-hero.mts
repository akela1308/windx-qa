// Снимок первого экрана главной: npx tsx scripts/shoot-hero.mts <файл.png> [ширина]
import { chromium } from "playwright";
const w = Number(process.argv[3] ?? 1440);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: w, height: 900 } });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
await p.screenshot({ path: process.argv[2] });
await b.close();
