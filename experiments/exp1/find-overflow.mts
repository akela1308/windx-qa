// Ищет элементы, которые на телефоне шире экрана: npx tsx experiments/exp1/find-overflow.mts <страница.html>
import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto(`file://${process.argv[2]}`, { waitUntil: "networkidle" });
const wide = await p.evaluate(() => [...document.querySelectorAll("body *")]
  .filter((e) => e.getBoundingClientRect().right > 391 && !e.closest("[style*=overflow],.strip,.mq,.bw,.fb,.tw"))
  .slice(0, 8).map((e) => `${e.tagName}.${(e as HTMLElement).className} right=${Math.round(e.getBoundingClientRect().right)} ${(e.textContent ?? "").slice(0, 40)}`));
console.log(wide.join("\n"));
await b.close();
