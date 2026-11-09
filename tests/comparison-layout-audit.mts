import assert from "node:assert/strict";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { inspectPageLayout } from "./helpers/inspect-page-layout";
import { SiteDocSchema } from "../experiments/exp1/a/schema";
import { renderDoc } from "../src/lib/design/render";
import { FONTS } from "../experiments/exp1/a/fonts";

const root = path.resolve("docs/generator-comparison-2026-11-06");
const output = path.resolve(
  process.argv[2] ?? "data/verification/comparison-layout-2026-11-06",
);
const widths = [320, 390, 760, 768, 1024, 1440, 1920];
const files = (await readdir(path.join(root, "pages")))
  .filter((f) => f.endsWith(".html"))
  .sort();
assert.equal(files.length, 12);
await mkdir(output, { recursive: true });
await mkdir(path.join(output, "pages"), { recursive: true });
const browser = await chromium.launch({ headless: true });
const results: Record<string, unknown>[] = [];
const sources: { file: string; documentSha256: string; htmlSha256: string }[] =
  [];
try {
  const page = await browser.newPage();
  // tsx adds function-name helpers; preserve their no-op semantics when the
  // self-contained inspector is serialised into a browser without tsx.
  const measure = () =>
    page.evaluate<ReturnType<typeof inspectPageLayout>>(
      `(()=>{const __name=(fn)=>fn;return (${inspectPageLayout.toString()})();})()`,
    );
  // These controls reproduce hidden clipping and a layout collision that a
  // document.scrollWidth-only check would miss. No special app flags are used.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(
    '<main><p style="width:80px;white-space:nowrap;overflow:hidden">Alex Morgan Demo</p><section style="position:relative"><h2>First heading</h2><p style="position:absolute;top:0;margin:0">Overlapping copy</p></section></main>',
  );
  const negative = await measure();
  assert.equal(negative.scrollWidth, 390);
  assert.ok(negative.issues.some((i) => i.kind === "text-clipped-x"));
  // Keep the overlap pair in an actual section, as generated site blocks are.
  await page
    .locator("section")
    .evaluate((el) => el.setAttribute("data-section", "test"));
  assert.ok((await measure()).issues.some((i) => i.kind === "text-overlap"));
  await page.setContent(
    "<main><details><summary>Question</summary><p>Hidden answer</p></details><p>Visible content</p></main>",
  );
  assert.ok(
    !(await measure()).issues.some((i) => i.text.includes("Hidden answer")),
  );
  await page.setContent(
    '<main><p style="height:5px;overflow:hidden;font-size:32px">Clipped vertically</p></main>',
  );
  assert.ok((await measure()).issues.some((i) => i.kind === "text-clipped-y"));
  for (const file of files) {
    const source = await readFile(
      path.join(root, "outputs", file.replace(".html", "-rendered.json")),
      "utf8",
    );
    const doc = SiteDocSchema.parse(JSON.parse(source));
    const html = renderDoc(doc).replaceAll(
      'src="/media/',
      `src="${pathToFileURL(path.join(root, "media")).href}/`,
    );
    const rendered = path.join(output, "pages", file);
    await writeFile(rendered, html);
    sources.push({
      file,
      documentSha256: createHash("sha256").update(source).digest("hex"),
      htmlSha256: createHash("sha256").update(html).digest("hex"),
    });
    const expectedFonts = [
      ...new Set(
        [doc.tokens.displayFont, doc.tokens.bodyFont].map((key) =>
          FONTS[key].css.split(",")[0].replace(/['"]/g, ""),
        ),
      ),
    ];
    for (const width of widths) {
      await page.setViewportSize({ width, height: width <= 768 ? 844 : 1000 });
      await page.goto(pathToFileURL(rendered).href);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((img) => img.decode()));
      });
      const measurement = await measure();
      const row = {
        file,
        state: "default",
        fontsLoaded: expectedFonts.every((f) => measurement.fonts.includes(f)),
        ...measurement,
      };
      results.push(row);
      if ([390, 1440].includes(width) || measurement.issues.length) {
        await page.screenshot({
          path: path.join(output, file.replace(".html", `-${width}.jpg`)),
          type: "jpeg",
          quality: 85,
          fullPage: true,
        });
      }
      if (measurement.issues.length)
        console.log(
          JSON.stringify({ file, width, issues: measurement.issues }),
        );
      for (const [index, section] of (
        await page.locator('[data-section="signature.giant-figure"]').all()
      ).entries())
        if ([390, 1440].includes(width))
          await section.screenshot({
            path: path.join(
              output,
              file.replace(".html", `-figure-${index}-${width}.jpg`),
            ),
            type: "jpeg",
            quality: 90,
          });
      const closed = await page.locator("details:not([open])>summary").all();
      if (closed.length) {
        for (const detail of await page.locator("details").all())
          if ((await detail.getAttribute("open")) === null)
            await detail.locator("summary").click();
        const expanded = await measure();
        results.push({
          file,
          state: "all-details-open",
          fontsLoaded: expectedFonts.every((f) => expanded.fonts.includes(f)),
          ...expanded,
        });
        if ([390, 1440].includes(width) || expanded.issues.length)
          await page.screenshot({
            path: path.join(
              output,
              file.replace(".html", `-${width}-expanded.jpg`),
            ),
            type: "jpeg",
            quality: 85,
            fullPage: true,
          });
        if (expanded.issues.length)
          console.log(
            JSON.stringify({
              file,
              width,
              state: "all-details-open",
              issues: expanded.issues,
            }),
          );
      }
    }
  }
  await writeFile(
    path.join(output, "measurements.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
  const failures = results.filter(
    (r) =>
      (r.issues as unknown[]).length ||
      !r.fontsLoaded ||
      Number(r.scrollWidth) > Number(r.width) + 1 ||
      (r.images as { loaded: boolean }[]).some((i) => !i.loaded) ||
      (Number(r.width) <= 390 &&
        (r.primaryActionBottom === null ||
          Number(r.primaryActionBottom) > Number(r.viewportHeight))),
  );
  await writeFile(
    path.join(output, "summary.json"),
    JSON.stringify(
      {
        browser: browser.version(),
        pages: files.length,
        widths,
        states: results.length,
        failedStates: failures.length,
        negativeControls: [
          "hidden horizontal clipping",
          "vertical clipping",
          "text collision",
          "closed FAQ visibility",
        ],
        sources,
        issues: failures.map((r) => ({
          file: r.file,
          width: r.width,
          state: r.state,
          fontsLoaded: r.fontsLoaded,
          issues: r.issues,
        })),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      pages: files.length,
      states: results.length,
      failedStates: failures.length,
      output,
    }),
  );
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
}
