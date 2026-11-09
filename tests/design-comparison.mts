import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const root = path.resolve("docs/generator-comparison-2026-11-06");
const checks = JSON.parse(
  await readFile(path.join(root, "checks.json"), "utf8"),
) as {
  key: string;
  width: number;
  scrollWidth: number;
  ctaBottom: number | null;
  images: { loaded: boolean; alt: boolean }[];
  photoPlaceholders: number;
}[];
assert.equal(checks.length, 24);
for (const row of checks) {
  assert.ok(row.scrollWidth <= row.width + 1, row.key);
  assert.ok(
    row.images.every((image) => image.loaded && image.alt),
    row.key,
  );
  assert.equal(row.photoPlaceholders, 0, row.key);
  if (row.width === 390)
    assert.ok(row.ctaBottom !== null && row.ctaBottom <= 844, row.key);
}
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(root, "index.html")).href);
  assert.equal(await page.locator("article").count(), 12);
  for (const id of ["speaker", "ceramics", "technical", "music"]) {
    await page.locator(`[data-pick="${id}"]`).click();
    assert.equal(
      await page.locator(`[data-case="${id}"] article:visible`).count(),
      3,
    );
    assert.equal(await page.locator("[data-case]:visible").count(), 1);
  }
  await page
    .locator('[data-case="music"] article')
    .last()
    .locator("summary")
    .click();
  await page
    .locator('[data-case="music"] article')
    .last()
    .getByText("Дополнить атмосферу позже, только по желанию владельца", {
      exact: true,
    })
    .waitFor();
  await mkdir(path.join(root, "verification"), { recursive: true });
  await page.screenshot({
    path: path.join(root, "verification/comparison-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await page.screenshot({
    path: path.join(root, "verification/comparison-mobile.png"),
  });
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(root, "verification/comparison.json"),
    JSON.stringify(
      {
        pages: 12,
        captures: 24,
        workingCaseSwitches: 4,
        mobileGalleryWidth: 390,
        pageErrors: errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: 12 rendered API results, 24 viewport measurements, loaded images, visible phone actions, four case switches and offline comparison gallery.",
  );
} finally {
  await browser.close();
}
