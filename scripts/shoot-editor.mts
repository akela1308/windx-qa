// Скриншот настоящего редактора для главной: создаёт сайт и делает одну правку.
// Запуск при работающем кабинете: npx tsx scripts/shoot-editor.mts [адрес]
import { rm } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`${BASE}/?style=signal#create`);
await page.getByRole("button", { name: "Bike workshop" }).click();
await page.getByRole("button", { name: "Create my site" }).click();
await page.waitForURL(/\/sites\//, { timeout: 30000 });
await page.fill("input[name=request]", "Show the services differently");
await page.getByRole("button", { name: "Send" }).click();
await page.getByText("Services are now shown as").waitFor({ timeout: 15000 });
await page.frameLocator("iframe[title*=', version ']").locator("h1").waitFor();
await page.waitForTimeout(1500); // шрифты сайта в превью
await page.screenshot({ path: "public/showcase/editor.jpg", type: "jpeg", quality: 80 });
const siteId = new URL(page.url()).pathname.split("/").pop()!;
await browser.close();
// Убираем созданный для снимка сайт, чтобы не копить тестовые сайты в списке.
// Работает только для локального кабинета (данные в ./data).
if (BASE.includes("localhost")) {
  await rm(path.join(process.cwd(), "data/sites", siteId), { recursive: true, force: true });
}
console.log("ok");
