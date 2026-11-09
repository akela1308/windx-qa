import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { CodePropsSchema, codeDocument } from "../experiments/exp1/a/compositions/embed";
import { SiteDocSchema } from "../experiments/exp1/a/schema";
import { renderDoc } from "../experiments/exp1/a/render-node";
import { validateDoc } from "../experiments/exp1/a/validate";
import { validateEditDoc } from "../src/lib/sites/edit-review";
import { describeForEdit } from "../src/lib/sites/patch";

const code = { title: "Demo counter", html: '<button id="count">0</button>', css: 'button { color: purple }', js: 'document.getElementById("count").onclick = e => e.target.textContent++; // seamless — user source', height: 240, mobileHeight: 360 };
const base = SiteDocSchema.parse(JSON.parse(await readFile("docs/experiment-1c/outputs/bike/light.json", "utf8")));

test("код ограничен рамкой и не проходит через правила копирайта", () => {
  const doc = structuredClone(base);
  doc.sections.splice(-1, 0, { composition: "embed.code", id: "code-test", tone: "default", props: code });
  assert.equal(validateDoc(doc, undefined, { antiSlop: true }).ok, true);
  const html = renderDoc(doc);
  assert.match(html, /sandbox="allow-scripts"/);
  assert.doesNotMatch(html, /allow-same-origin/);
  assert.ok(!html.includes('<button id="count">'), "код не попадает в DOM родителя");
  const src = codeDocument({ ...code, js: 'const closing = "</script>";', css: 'p::after{content:"</style>"}' });
  assert.ok(src.includes('<\\/script>'));
  assert.ok(src.includes('<\\/style>'));
  assert.ok(src.includes("base-uri 'none'; form-action 'none'"));
  assert.equal(CodePropsSchema.safeParse({ ...code, html: "", css: "", js: "" }).success, false);
  assert.equal(CodePropsSchema.safeParse({ ...code, height: 2001 }).success, false);
  assert.equal(CodePropsSchema.safeParse({ ...code, html: "x".repeat(50001) }).success, false);
  assert.equal(validateEditDoc(doc, base).ok, false, "AI не добавляет код");
  assert.equal(validateEditDoc(base, doc).ok, false, "AI не удаляет код");
  const changed = structuredClone(doc);
  const block = changed.sections.find((s) => s.composition === "embed.code")!;
  (block.props as Record<string, unknown>).js = "alert(1)";
  assert.equal(validateEditDoc(changed, doc).ok, false, "AI не меняет код");
  assert.equal(validateEditDoc(doc, doc).ok, true);
  assert.ok(!describeForEdit(doc).includes(code.js));
  assert.ok(!describeForEdit(doc).includes(code.html));
});

// Добавление, правка, удаление, история и публикация через HTTP: tests/journey-http.mts.
