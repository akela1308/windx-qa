// Снимки для проверки глазами: главная и редактор на компьютере и телефоне (по экранам).
// Запуск при работающем кабинете: npx tsx scripts/shoot-review.mts <папка> <id сайта>
import { chromium } from "playwright";
const [out, siteId] = [process.argv[2], process.argv[3]];
const b = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, "d"], [390, 844, "m"]] as const) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0, i = 0; y < total && i < 9; y += h, i++) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${out}/home-${tag}-${i}.png` });
  }
  await p.goto(`http://localhost:3000/sites/${siteId}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/editor-${tag}.png` });
  await p.close();
}
await b.close();
