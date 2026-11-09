import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { blankCanvas } from "../src/lib/free-editor/blank";
import {
  PublishedCanvasSchema,
  LinkSchema,
} from "../src/lib/free-editor/model";
import { newElement } from "../src/lib/free-editor/examples";
import { validateDoc } from "../src/lib/design";
import { renderDoc } from "../experiments/exp1/a/render-node";
import {
  validateEditDoc,
  describeCanvasChanges,
} from "../src/lib/sites/edit-review";
import { describeForEdit } from "../src/lib/sites/patch";
import { VersionSchema } from "../src/lib/backups/format";
const base = JSON.parse(
  await readFile("docs/experiment-1c/outputs/bike/light.json", "utf8"),
);
const canvas = blankCanvas(
  "Owner block",
  "Unique owner text — kept exactly",
  "#ffffff",
  "#20201d",
);
canvas.elements[0].name = "Heading layer";
const section = {
  composition: "free.canvas",
  id: "free-unit",
  tone: "default",
  props: { canvas },
};
const withCanvas = structuredClone(base);
withCanvas.sections.splice(2, 0, section);
test("production canvas validates owned images, safe links and bounded independent layouts", () => {
  assert.ok(PublishedCanvasSchema.safeParse(canvas).success);
  for (const href of [
    "javascript:alert(1)",
    "data:text/html,x",
    "//evil.test",
    "https://user:password@example.test",
    "/\\evil.test",
    "tel:bad",
  ])
    assert.equal(LinkSchema.safeParse(href).success, false, href);
  for (const href of [
    "https://example.test/path",
    "/contact",
    "#contact",
    "mailto:owner@example.test",
    "tel:+442012345678",
  ])
    assert.ok(LinkSchema.safeParse(href).success, href);
  for (const src of [
    "",
    "https://example.test/a.png",
    "/free-editor/wheel.svg",
    "data:image/svg+xml,x",
  ])
    assert.equal(
      PublishedCanvasSchema.safeParse({
        ...canvas,
        elements: [{ ...newElement("image", "photo"), src }],
      }).success,
      false,
      src,
    );
  assert.ok(
    PublishedCanvasSchema.safeParse({
      ...canvas,
      elements: [
        {
          ...newElement("image", "photo"),
          src: "/media/owner-site/12345678-1234-1234-1234-123456789abc.webp",
        },
      ],
    }).success,
  );
  assert.equal(
    PublishedCanvasSchema.safeParse({
      ...canvas,
      format: "windx-free-block-prototype",
    }).success,
    false,
  );
  assert.equal(
    PublishedCanvasSchema.safeParse({
      ...canvas,
      elements: [
        {
          ...canvas.elements[0],
          phone: { x: 359, y: 0, width: 10, height: 20 },
        },
      ],
    }).success,
    false,
  );
});
test("manual canvas renders semantic escaped HTML, review preserves neighbours, AI cannot rewrite it", () => {
  assert.ok(validateDoc(withCanvas).ok);
  const missingId=structuredClone(withCanvas);delete missingId.sections[2].id;assert.equal(validateDoc(missingId).ok,false);
  const duplicateId=structuredClone(withCanvas);duplicateId.sections[0].id="free-unit";assert.equal(validateDoc(duplicateId).ok,false);
  const html = renderDoc(withCanvas);
  assert.ok(html.includes("Unique owner text — kept exactly"));
  assert.match(html, /data-free-element="text-1"/);
  assert.match(html, /100cqw/);
  assert.ok(!html.includes("wfe-scene"));
  const linked = structuredClone(withCanvas);
  linked.sections[2].props.canvas.elements[0].href = "tel:+442012345678";
  linked.sections[2].props.canvas.elements[0].text =
    "<script>alert(1)</script>";
  const rendered = renderDoc(linked);
  assert.match(rendered, /href="tel:\+442012345678"/);
  assert.ok(rendered.includes("&lt;script&gt;"));
  assert.ok(!rendered.includes("<script>alert(1)</script>"));
  const diff = describeCanvasChanges(base, withCanvas);
  assert.equal(diff.length, 1);
  assert.equal(diff[0].area, "free");
  assert.ok(diff[0].after.includes("Width 640px") || diff[0].after.includes("Width 960px"));assert.ok(!diff[0].after.includes("windx-free-block"));assert.ok(describeCanvasChanges(base,withCanvas,"ru")[0].after.includes("Ширина"));
  assert.equal(validateEditDoc(withCanvas, base).ok, false);
  assert.equal(validateEditDoc(base, withCanvas).ok, false);
  assert.equal(validateEditDoc(linked, withCanvas).ok, false);
  assert.equal(validateEditDoc(withCanvas, withCanvas).ok, true);
  const compact = describeForEdit(withCanvas);
  assert.ok(compact.includes("free-unit"));
  assert.equal(canvas.elements[0].type, "text");
  if (canvas.elements[0].type === "text") assert.ok(!compact.includes(canvas.elements[0].text));
  assert.ok(!compact.includes('"phoneSize"'));
  assert.ok(
    VersionSchema.safeParse({
      n: 2,
      createdAt: new Date().toISOString(),
      action: "canvas",
      request: "manual",
      reply: "manual",
      doc: withCanvas,
      demo: false,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, estimated: false },
    }).success,
  );
});
