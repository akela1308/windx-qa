import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";
import { createSession } from "../src/lib/auth/accounts";
import { FileSiteStore } from "../src/lib/storage/file-store";
import { SiteDocSchema } from "../experiments/exp1/a/schema";
import { renderDoc } from "../src/lib/design/render";

const root = await mkdtemp(path.join(os.tmpdir(), "windx-image-plan-browser-"));
process.env.WINDX_DATA_DIR = root;
const raw = new FileSiteStore(root),
  now = new Date().toISOString(),
  port = 3249,
  base = `http://127.0.0.1:${port}`,
  id = "image-plan-browser";
const original = JSON.parse(
  await readFile("docs/experiment-1c/outputs/bike/light.json", "utf8"),
);
const doc = SiteDocSchema.parse({
  ...original,
  factsToConfirm: [],
  visualPlan: {
    intent: "PRIVATE_GUIDANCE_ONLY",
    layout: "Introduce a person, with an optional portrait after the opening",
    references: [],
    images: [
      {
        sectionId: "intro",
        role: "person",
        source: "optional-owner",
        subject: "Портрет автора",
        purpose: "Представить человека рядом с его темами",
        framing: "portrait",
        placement: "После вступления, перед темами",
        focalPoint: "Голова и плечи",
      },
    ],
  },
  sections: [
    {
      composition: "header.inline",
      id: "top",
      tone: "default",
      props: { name: "DEMO ONLY Speaker", links: [] },
    },
    {
      composition: "hero.statement",
      id: "intro",
      tone: "default",
      props: {
        statement: "Talks for working teams",
        detail: "A fictional speaker and unpublished design demonstration.",
        align: "left",
        cta: { label: "Read the topics", href: "#topics" },
      },
    },
    {
      composition: "services.disclosure",
      id: "topics",
      tone: "default",
      props: {
        title: "Topics",
        items: [
          {
            name: "Team decisions",
            description: "Choosing a next step together.",
          },
          {
            name: "Working through uncertainty",
            description: "Decisions with incomplete information.",
          },
        ],
      },
    },
    {
      composition: "footer.simple",
      id: "end",
      tone: "default",
      props: { name: "DEMO ONLY Speaker", lines: [], links: [] },
    },
  ],
});
assert.ok(!renderDoc(doc).includes("PRIVATE_GUIDANCE_ONLY"));
await raw.saveSite({
  id,
  ownerId: "owner",
  name: "Image plan browser test",
  brief: "demo",
  facts: {},
  currentVersion: 1,
  versionCount: 1,
  createdAt: now,
  updatedAt: now,
});
await raw.addVersion(id, {
  n: 1,
  createdAt: now,
  action: "create",
  request: "demo",
  reply: "demo",
  doc,
  demo: true,
  usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, estimated: false },
});
const token = await createSession({ id: "owner", email: "owner@example.test" });
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    env: { ...process.env, AI_DEMO: "1", NODE_ENV: "production" },
    stdio: "pipe",
  },
);
let logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/login")).status === 200) break;
    } catch {}
    if (server.exitCode !== null) throw Error(logs);
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    extraHTTPHeaders: {
      cookie: `__Host-windx_session=${token}; windx_lang=ru`,
    },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + `/sites/${id}`);
  await page
    .getByRole("tab", { name: "Текст и изображения", exact: true })
    .click();
  const panel = page.getByRole("tabpanel");
  await panel
    .locator("summary")
    .filter({ hasText: "План изображений" })
    .click();
  await panel.getByText("Портрет автора", { exact: true }).waitFor();
  await panel
    .getByRole("button", {
      name: "Добавить изображение в этом месте",
      exact: true,
    })
    .click();
  assert.equal(
    await panel.locator('input[name="afterSection"]').inputValue(),
    "1",
  );
  assert.match(
    await panel
      .getByRole("combobox")
      .first()
      .locator("option:checked")
      .innerText(),
    /после раздела 2/,
  );
  await panel
    .locator('input[type="file"]')
    .setInputFiles({
      name: "portrait.webp",
      mimeType: "image/webp",
      buffer: await readFile(
        "experiments/reference-design/assets/speaker.webp",
      ),
    });
  await panel.getByText("Изображение загружено.", { exact: false }).waitFor();
  await panel
    .getByLabel("Описание изображения", { exact: true })
    .fill("Демонстрационный портрет");
  await panel
    .getByRole("button", { name: "Посмотреть изменения", exact: true })
    .click();
  await panel
    .getByRole("button", { name: "Применить изменения", exact: true })
    .waitFor();
  assert.equal(
    (await raw.getSite(id))!.currentVersion,
    1,
    "Review cannot apply the change silently",
  );
  const pending = (await raw.getPendingEdit(id))!;
  assert.equal(pending.version.doc.sections[2].composition, "media.image");
  assert.equal(
    (pending.version.doc.sections[2].props as { framing: string }).framing,
    "portrait",
  );
  assert.deepEqual(
    pending.version.doc.sections.filter((_, i) => i !== 2),
    doc.sections,
  );
  assert.equal(pending.version.doc.visualPlan!.images[0].source, "owner");
  assert.equal(
    pending.version.doc.visualPlan!.images[0].subject,
    "Демонстрационный портрет",
  );
  await panel
    .getByRole("button", { name: "Применить изменения", exact: true })
    .click();
  await page.locator('iframe[title*="version 2"]').waitFor();
  await page.reload();
  await page
    .getByRole("tab", { name: "Текст и изображения", exact: true })
    .click();
  await panel
    .locator("summary")
    .filter({ hasText: "План изображений" })
    .click();
  await panel.getByText("Демонстрационный портрет", { exact: true }).waitFor();
  assert.equal(
    await panel
      .getByRole("button", {
        name: "Добавить изображение в этом месте",
        exact: true,
      })
      .count(),
    0,
  );
  const frame = page.frameLocator('iframe[title*="version"]');
  const image = frame.getByRole("img", {
    name: "Демонстрационный портрет",
    exact: true,
  });
  await image.waitFor();
  const ratio = await image.evaluate((i) => {
    const r = i.parentElement!.getBoundingClientRect();
    return r.width / r.height;
  });
  assert.ok(
    Math.abs(ratio - 0.8) < 0.02,
    "Planned portrait framing must survive insertion",
  );
  const proof = "docs/generator-comparison-2026-11-06/verification";
  await mkdir(proof, { recursive: true });
  await page.screenshot({
    path: path.join(proof, "image-plan-editor-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await page.screenshot({
    path: path.join(proof, "image-plan-editor-mobile.png"),
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: private image plan, exact insertion position, owner upload, portrait framing, review/apply, unchanged neighbours, updated guidance, persistence and mobile width. No AI or publication.",
  );
} catch (e) {
  console.error(logs.slice(-1500));
  throw e;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  if (server.exitCode === null)
    await new Promise<void>((resolve) => server.once("exit", () => resolve()));
  await rm(root, { recursive: true, force: true });
}
