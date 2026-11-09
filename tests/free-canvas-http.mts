import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { FileSiteStore } from "../src/lib/storage/file-store";
import { createSession } from "../src/lib/auth/accounts";
import { blankCanvas } from "../src/lib/free-editor/blank";
import { mediaRefs } from "../src/lib/media/refs";
import { parseBackup, restoreBackup } from "../src/lib/backups/service";
import type { Site } from "../src/lib/storage/types";
const root = await mkdtemp(path.join(os.tmpdir(), "windx-canvas-http-"));
process.env.WINDX_DATA_DIR = root;
const port = 3231,
  base = `http://127.0.0.1:${port}`,
  store = new FileSiteStore(root),
  now = new Date().toISOString();
const site: Site = {
  id: "canvas-owner",
  ownerId: "canvas-member",
  name: "DEMO ONLY canvas",
  brief: "Test fixture",
  facts: {},
  currentVersion: 1,
  versionCount: 1,
  createdAt: now,
  updatedAt: now,
  published: { slug: "canvas-owner", version: 1, at: now },
};
const doc = JSON.parse(
  await readFile("docs/experiment-1c/outputs/bike/light.json", "utf8"),
);
doc.factsToConfirm = [];
await store.saveSite(site);
await store.addVersion(site.id, {
  n: 1,
  createdAt: now,
  action: "create",
  request: "fixture",
  reply: "fixture",
  doc,
  demo: true,
  usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, estimated: false },
});
const token = await createSession({
    id: site.ownerId!,
    email: "canvas@example.test",
  }),
  foreign = await createSession({
    id: "other-member",
    email: "other@example.test",
  }),
  guest = await createSession({ id: "guest-canvas", email: "", guest: true });
const auth = (value = token): Record<string,string> =>
  value ? { cookie: `__Host-windx_session=${value}` } : {};
let server: ChildProcess | undefined,
  browser: Awaited<ReturnType<typeof chromium.launch>> | undefined,
  logs = "";
try {
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      String(port),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        AI_DEMO: "1",
        WINDX_MAIL_PROVIDER: "disabled",
      },
      stdio: "pipe",
    },
  );
  server.stdout?.on("data", (d) => (logs += d));
  server.stderr?.on("data", (d) => (logs += d));
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/login")).ok) break;
    } catch {}
    if (server.exitCode !== null) throw Error(logs);
    await new Promise((r) => setTimeout(r, 100));
  }
  const manifest = JSON.parse(
    await readFile(".next/server/server-reference-manifest.json", "utf8"),
  );
  const actions = Object.entries(manifest.node) as [
    string,
    { exportedName: string },
  ][];
  const { encodeReply } = createRequire(import.meta.url)(
    "next/dist/compiled/react-server-dom-turbopack/client.node",
  ) as { encodeReply: (args: unknown[]) => Promise<string | FormData> };
  async function action(name: string, args: unknown[], value = token) {
    const id = actions.find(([, a]) => a.exportedName === name)?.[0];
    assert.ok(id, name);
    const body = await encodeReply(args);
    const r = await fetch(base + `/sites/${site.id}/canvas`, {
      method: "POST",
      headers: {
        "Next-Action": id,
        origin: base,
        ...auth(value),
        ...(typeof body === "string"
          ? { "content-type": "text/plain;charset=UTF-8" }
          : {}),
      },
      body,
      redirect: "manual",
    });
    return { status: r.status, text: await r.text() };
  }
  function proposal(
    canvas: unknown,
    version = 1,
    sectionId = "",
    remove = false,
  ) {
    const f = new FormData();
    f.set("canvas", JSON.stringify(canvas));
    f.set("baseVersion", String(version));
    f.set("sectionId", sectionId);
    f.set("after", "footer");
    f.set("intent", remove ? "remove" : "save");
    return f;
  }
  const run = (f: FormData, value = token) =>
    action("canvasAction", [site.id, { status: "idle" }, f], value);
  const review = (id: string, decision: string) => {
    const f = new FormData();
    f.set("editId", id);
    f.set("decision", decision);
    return f;
  };
  for (const value of ["", guest, foreign]) {
    const r = await fetch(base + `/sites/${site.id}/canvas`, {
      headers: auth(value),
    });
    assert.ok(!(await r.text()).includes("DEMO ONLY canvas"));
    await run(proposal(blankCanvas("Denied", "Denied")), value);
    assert.equal(await store.getPendingEdit(site.id), null);
  }
  const bad = blankCanvas("Unsafe", "Bad");
  (bad.elements[0] as { href?: string }).href = "javascript:alert(1)";
  await run(proposal(bad));
  assert.equal(await store.getPendingEdit(site.id), null);
  for (const src of [
    "https://example.test/a.png",
    "/free-editor/wheel.svg",
    "/media/other-site/12345678-1234-1234-1234-123456789abc.webp",
  ]) {
    await run(
      proposal({
        ...blankCanvas("Image", "Image"),
        elements: [
          {
            id: "image",
            name: "image",
            type: "image",
            layer: 0,
            desktop: { x: 0, y: 0, width: 100, height: 100 },
            phone: { x: 0, y: 0, width: 100, height: 100 },
            src,
            alt: "Test",
            fit: "cover",
            radius: 0,
          },
        ],
      }),
    );
    assert.equal(await store.getPendingEdit(site.id), null);
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    {
      name: "__Host-windx_session",
      value: token,
      domain: "127.0.0.1",
      path: "/",
      secure: true,
      httpOnly: true,
    },
  ]);
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => (logs += "\nBROWSER " + e.message));
  await page.goto(base + `/sites/${site.id}`);
  await page.getByRole("tab", { name: "Free canvas", exact: true }).click();
  await page
    .getByRole("link", { name: "Add a free block", exact: true })
    .click();
  await page
    .getByLabel("Element text", { exact: true })
    .fill("DEMO ONLY: freely arranged");
  await page.getByLabel("X", { exact: true }).fill("120");
  await page.getByRole("button", { name: "Phone", exact: true }).click();
  assert.equal(await page.getByLabel("X", { exact: true }).inputValue(), "24");
  await page.getByLabel("X", { exact: true }).fill("32");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  assert.equal(await page.getByLabel("X", { exact: true }).inputValue(), "24");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  assert.equal(await page.getByLabel("X", { exact: true }).inputValue(), "32");
  await page.getByRole("button", { name: "Desktop", exact: true }).click();
  assert.equal(await page.getByLabel("X", { exact: true }).inputValue(), "120");
  const selected = page.locator('[data-element-id="text-1"]');
  await page.waitForFunction(()=>document.querySelector("[data-testid=free-canvas]")!.getBoundingClientRect().width>100);
  const initial = await selected.boundingBox();
  assert.ok(initial && initial.width>100);
  await page.mouse.move(initial.x + 20, initial.y + 20);
  await page.mouse.down();
  await page.mouse.move(initial.x + 50, initial.y + 40, { steps: 5 });
  await page.mouse.up();
  assert.ok(
    Number(await page.getByLabel("X", { exact: true }).inputValue()) > 120,
  );
  await page
    .getByLabel("Link (optional)", { exact: true })
    .fill("https://example.test/contact");
  await page.getByRole("button", { name: "Set link", exact: true }).click();
  await page.getByRole("button", { name: "Add shape", exact: true }).click();
  const shapeNode=page.locator(".wfe-selected"); await shapeNode.focus(); await page.keyboard.press("ArrowRight"); assert.equal(await page.getByLabel("X",{exact:true}).inputValue(),"81");
  const beforeResize=Number(await page.getByLabel("Width",{exact:true}).inputValue()), handle=await page.locator(".wfe-handle").boundingBox(); assert.ok(handle); await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+25,handle.y+handle.height/2+15,{steps:4});await page.mouse.up();assert.ok(Number(await page.getByLabel("Width",{exact:true}).inputValue())>beforeResize);
  await page.getByLabel("X", { exact: true }).fill("0");
  await page.getByLabel("Y", { exact: true }).fill("300");
  await page.getByRole("button", { name: "Add image", exact: true }).click();
  const imagePath = path.join(root, "picture.png");
  await writeFile(
    imagePath,
    await sharp({
      create: { width: 80, height: 50, channels: 3, background: "#19845b" },
    })
      .png()
      .toBuffer(),
  );
  await page
    .getByLabel("Upload your image", { exact: true })
    .setInputFiles(imagePath);
  await page
    .getByRole("button", { name: "Uploading…", exact: true })
    .waitFor({ state: "hidden" });
  await page
    .getByLabel("Image description", { exact: true })
    .fill("Owner green photograph");
  await page.getByLabel("Y", { exact: true }).fill("240");
  await page.screenshot({
    path: "data/verification/free-canvas-local-editor-2026-11-01.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Review changes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .waitFor();
  let pending = await store.getPendingEdit(site.id);
  assert.ok(pending?.canvas);
  assert.equal(pending.version.action, "canvas");
  assert.equal(pending.version.usage.costUsd, 0);
  assert.equal((await store.getSite(site.id))?.currentVersion, 1);
  assert.deepEqual(
    pending.version.doc.sections.filter((s) => s.composition !== "free.canvas"),
    doc.sections,
  );
  assert.ok(!JSON.stringify(pending.version).includes("aiUsage"));
  const sectionId = pending.canvas.sectionId;
  await page.reload();
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .waitFor();
  assert.equal((await store.getPendingEdit(site.id))?.id, pending.id);
  await run(proposal(blankCanvas("Blocked", "Blocked")));
  assert.equal((await store.getPendingEdit(site.id))?.id, pending.id);
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await page.waitForURL(/saved=1/);
  assert.equal((await store.getSite(site.id))?.currentVersion, 2);
  assert.equal((await store.getSite(site.id))?.published?.version, 1);
  assert.ok(
    !(await (await fetch(base + "/live/canvas-owner")).text()).includes(
      "DEMO ONLY: freely arranged",
    ),
  );
  const saved = (await store.getVersion(site.id, 2))!.doc,
    block = saved.sections.find((s) => s.composition === "free.canvas")!;
  const savedCanvas = (
    block.props as { canvas: ReturnType<typeof blankCanvas> }
  ).canvas;
  assert.equal(savedCanvas.elements[0].phone.x, 32);
  assert.ok(savedCanvas.elements[0].desktop.x > 120);
  await action("publishAction", [site.id]);
  assert.equal((await store.getSite(site.id))?.published?.version, 2);
  const publicPage = await context.newPage();
  for (const width of [320, 390, 768, 1200]) {
    await publicPage.setViewportSize({ width, height: 1000 });
    await publicPage.goto(base + "/live/canvas-owner");
    await publicPage
      .getByText("DEMO ONLY: freely arranged", { exact: true })
      .waitFor();
    assert.equal(
      await publicPage.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `overflow ${width}`,
    );
    const bounds = await publicPage
        .locator('[data-free-element="text-1"]')
        .boundingBox(),
      container = await publicPage.locator(".wfb").boundingBox();
    assert.ok(bounds && container);
    const layout =
        width <= 760
          ? savedCanvas.elements[0].phone
          : savedCanvas.elements[0].desktop,
      scale = container.width / (width <= 760 ? 360 : 1120);
    assert.ok(Math.abs(bounds.x - container.x - layout.x * scale) < 1);
    assert.ok(Math.abs(bounds.y - container.y - layout.y * scale) < 1);
    assert.equal(
      await publicPage
        .locator(".wfb-text")
        .evaluate((e) => getComputedStyle(e).textTransform),
      "none",
    );
    if (width === 390)
      await publicPage.screenshot({
        path: "data/verification/free-canvas-local-phone-2026-11-01.png",
        fullPage: true,
      });
  }
  assert.equal(
    await publicPage.locator(".wfb-link").getAttribute("href"),
    "https://example.test/contact",
  );
  const imageSrc = mediaRefs(saved)[0];
  assert.equal((await fetch(base + imageSrc)).status, 200);
  // New proposal is isolated from published version, can be discarded, and stale writes fail.
  const changed = structuredClone(savedCanvas);
  changed.title = "Updated canvas";
  await run(proposal(changed, 1, sectionId));
  assert.equal(await store.getPendingEdit(site.id), null);
  await run(proposal(changed, 2, sectionId));
  pending = await store.getPendingEdit(site.id);
  assert.ok(pending);
  await run(review(pending.id, "discard"));
  assert.equal((await store.getSite(site.id))?.currentVersion, 2);
  const backup = await parseBackup(
    Buffer.from(
      await (
        await fetch(base + `/sites/${site.id}/backup`, { headers: auth() })
      ).arrayBuffer(),
    ),
  );
  const restored = await restoreBackup(backup, site.ownerId!);
  const restoredDoc = (await store.getVersion(restored, 2))!.doc;
  assert.ok(
    mediaRefs(restoredDoc).every((src) =>
      src.startsWith(`/media/${restored}/`),
    ),
  );
  assert.equal((await store.getVersion(restored, 2))?.action, "canvas");
  await action("duplicateAction", [site.id]);
  const copy = (await store.listSites()).find(
    (s) => s.id !== site.id && s.id !== restored,
  )!;
  assert.ok(copy);
  assert.ok(
    mediaRefs((await store.getVersion(copy.id, 1))!.doc).every((src) =>
      src.startsWith(`/media/${copy.id}/`),
    ),
  );
  await run(proposal(savedCanvas, 2, sectionId, true));
  pending = await store.getPendingEdit(site.id);
  assert.ok(pending);
  assert.equal(
    pending.version.doc.sections.some((s) => s.composition === "free.canvas"),
    false,
  );
  await run(review(pending.id, "apply"));
  assert.equal((await store.getSite(site.id))?.currentVersion, 3);
  assert.equal((await store.getSite(site.id))?.published?.version, 2);
  await action("revertAction", [site.id, 2]);
  assert.equal((await store.getSite(site.id))?.currentVersion, 4);
  assert.equal(
    (await store.getVersion(site.id, 4))!.doc.sections.some(
      (s) => s.composition === "free.canvas",
    ),
    true,
  );
  await action("unpublishAction", [site.id]);
  assert.equal((await fetch(base + "/live/canvas-owner")).status, 404);
  for (const width of [390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base + `/sites/${site.id}/canvas?section=${sectionId}`);
    await page
      .getByRole("heading", { name: "Visual editor", exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: "data/verification/free-canvas-local-mobile-editor-2026-11-01.png",
      fullPage: true,
    });
  }
  assert.ok(!logs.includes("BROWSER"), logs.slice(-1500));
  console.log(
    "PASS canvas: real UI, drag, independent layouts, undo/redo, image upload, links, layers, reloadable review/apply, private ownership and forged actions, bounds and URLs, no AI, publish separation and responsive semantic HTML at 320/390/768/1200, stale/pending protection, backup/duplicate remapping, removal/restore/offline.",
  );
} catch (e) {
  console.error(logs.slice(-1500));
  throw e;
} finally {
  await browser?.close();
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((r) => server!.once("exit", r));
  }
  await rm(root, { recursive: true, force: true });
}
