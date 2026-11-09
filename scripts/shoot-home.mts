// Скриншоты главной на компьютере и телефоне: npx tsx scripts/shoot-home.mts <папка>
import { chromium } from "playwright";
const b = await chromium.launch();
for (const [w, h, name] of [[1440, 900, "home-desktop"], [390, 844, "home-mobile"]] as const) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${process.argv[2]}/${name}.png`, fullPage: true });
  console.log(name, await p.evaluate(() => document.documentElement.scrollWidth));
}
await b.close();
