import test from "node:test";
import assert from "node:assert/strict";
import { examples, newElement } from "../src/lib/free-editor/examples.ts";
import { CanvasDocSchema, parseDocument, patchBox, patchElement, reorder, history, commit, undo, redo } from "../src/lib/free-editor/model.ts";
import { appendSnapshot, decodeSnapshots } from "../src/lib/free-editor/storage.ts";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy.ts";

test("три композиции: переносимость, независимость экранов и стабильный порядок чтения", () => {
  for (const { doc } of examples) {
    assert.deepEqual(parseDocument(JSON.stringify(doc)), doc);
    const heading = doc.elements.find((e) => e.id === "headline")!;
    const moved = patchBox(doc, heading.id, "phone", { x: 8000, y: -40, width: 200 });
    assert.deepEqual(moved.elements.find((e) => e.id === heading.id)!.desktop, heading.desktop);
    assert.equal(moved.elements.find((e) => e.id === heading.id)!.phone.x, 160);
    assert.equal(moved.elements.find((e) => e.id === heading.id)!.phone.y, 0);
    assert.ok(CanvasDocSchema.safeParse(moved).success);
    const layered = reorder(doc, heading.id, 1);
    assert.deepEqual(layered.elements.map((e) => e.id), doc.elements.map((e) => e.id));
    assert.notEqual(layered.elements.find((e) => e.id === heading.id)!.layer, heading.layer);
    assert.deepEqual(reorder(layered, heading.id, -1), doc);
    const changed = patchElement(doc, heading.id, { text: "A much longer heading that remains complete in the document" });
    assert.deepEqual(changed.elements.filter((e) => e.id !== heading.id), doc.elements.filter((e) => e.id !== heading.id));
    assert.deepEqual(heading, doc.elements.find((e) => e.id === heading.id));
  }
});

test("история возвращает текст, размеры, слои, удаление и независимые раскладки целиком", () => {
  const doc = examples[0].doc;
  const a = patchBox(doc, "headline", "desktop", { x: 90 });
  const b = patchBox(a, "headline", "phone", { y: 120 });
  const c = reorder(b, "headline", 1);
  const d = { ...c, elements: c.elements.filter((e) => e.id !== "headline") };
  let h = history(doc);
  for (const next of [a, b, c, d]) h = commit(h, next);
  assert.deepEqual(undo(h).present, c);
  assert.deepEqual(undo(undo(undo(undo(h)))).present, doc);
  assert.deepEqual(redo(undo(h)).present, d);
  assert.equal(commit(undo(h), a).future.length, 0);
  for (let i = 0; i < 120; i++) h = commit(h, { ...d, title: `Version ${i}` });
  assert.equal(h.past.length, 80);
  const snapshots = appendSnapshot([], b);
  assert.deepEqual(decodeSnapshots(JSON.stringify(snapshots))[0].doc, b);
  let saved = snapshots;
  for (let i = 0; i < 12; i++) saved = appendSnapshot(saved, { ...doc, title: `Save ${i}` });
  assert.equal(saved.length, 8);
  assert.equal(saved.at(-1)!.doc.title, "Save 11");
});

test("импорт отклоняет повреждённые документы, опасные URL, дубли ID и рамки за пределами холста", () => {
  const doc = examples[0].doc;
  for (const src of ["javascript:alert(1)", "data:image/svg+xml,<svg/>", "//evil.example/x", "http://example.com/x.png", "https://user:secret@example.com/x.png", "/other/file.svg"]) {
    const image = { ...newElement("image", "test"), src };
    assert.throws(() => parseDocument(JSON.stringify({ ...doc, elements: [image] })));
  }
  assert.ok(CanvasDocSchema.safeParse({ ...doc, elements: [{ ...newElement("image", "test"), src: "https://example.com/picture.jpg" }] }).success);
  assert.throws(() => parseDocument(JSON.stringify({ ...doc, elements: [doc.elements[0], doc.elements[0]] })));
  assert.throws(() => parseDocument(JSON.stringify({ ...doc, version: 2 })));
  assert.throws(() => parseDocument(JSON.stringify({ ...doc, height: { desktop: 200, phone: 200 } })));
  assert.throws(() => parseDocument("x".repeat(250001)));
  assert.throws(() => decodeSnapshots("broken json"));
  assert.deepEqual(decodeSnapshots(null), []);
  assert.throws(() => patchElement(doc, "headline", { style: { font: "<script>" } } as never));
});

test("лаборатория скрыта в production, маршрутизация кабинета и сайтов остаётся прежней", async () => {
  const previous = { NODE_ENV: process.env.NODE_ENV, WINDX_EDITOR_LAB: process.env.WINDX_EDITOR_LAB, WINDX_DEMO_PASSWORD: process.env.WINDX_DEMO_PASSWORD };
  try {
    Object.assign(process.env, { NODE_ENV: "production" });
    delete process.env.WINDX_EDITOR_LAB; delete process.env.WINDX_DEMO_PASSWORD;
    const request = (path: string, host = "localhost") => new NextRequest(`http://${host}${path}`, { headers: { host } });
    const hidden = await proxy(request("/lab/free-editor"));
    assert.equal(hidden.status, 404);
    assert.equal(hidden.headers.get("cache-control"), "no-store");
    assert.equal((await proxy(request("/sites"))).headers.get("x-middleware-next"), "1");
    assert.equal((await proxy(request("/", "test.localhost"))).headers.get("x-middleware-rewrite"), "http://test.localhost/live/test");
    process.env.WINDX_EDITOR_LAB = "1";
    assert.equal((await proxy(request("/lab/free-editor"))).headers.get("x-middleware-next"), "1");
    process.env.WINDX_DEMO_PASSWORD = "lab-test-password";
    assert.equal((await proxy(request("/lab/free-editor"))).status, 401);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
