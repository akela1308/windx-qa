// Снимок сайта целиком по его превью: npx tsx scripts/shoot-site.mts <id> <файл.jpg> [ширина]
import { chromium } from "playwright";
const [id, out, w] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: Number(w ?? 1280), height: 900 } });
await p.goto(`http://localhost:3000/preview/${id}/1`, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
await p.screenshot({ path: out, fullPage: true, type: "jpeg", quality: 70, animations: "disabled" });
await b.close();
