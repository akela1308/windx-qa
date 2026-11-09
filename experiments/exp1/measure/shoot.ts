import type { Browser, Page } from "playwright";
import { chromium } from "playwright";
import { probe, type ProbeResult } from "./page-probe";

// Открывает локальную страницу, снимает скриншот целиком и скелет страницы.

export async function openBrowser(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // esbuild добавляет вызовы __name в функции; в браузере их нужно определить.
  await page.addInitScript(() => ((window as unknown as { __name: unknown }).__name = (f: unknown) => f));
  return { browser, page };
}

export async function shoot(page: Page, file: string, out: string, width: number): Promise<ProbeResult> {
  await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
  await page.goto(`file://${file}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, fullPage: true, type: "jpeg", quality: 62, animations: "disabled" });
  return page.evaluate(probe);
}
