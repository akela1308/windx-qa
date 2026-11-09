import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { COMPOSITIONS, SiteDocSchema } from "../experiments/exp1/a/schema";
import { renderDoc } from "../experiments/exp1/a/render-node";
import { describeChanges, validateEditDoc } from "../src/lib/sites/edit-review";
import { applyPatch } from "../src/lib/sites/patch";

const doc = SiteDocSchema.parse(JSON.parse(await readFile("docs/experiment-1/outputs/A/bike/gen1.json", "utf8")));

test("все композиции контактов сохраняют телефон и почту независимо от CTA", () => {
  const variants = [undefined, { label: "Email", href: "mailto:hello@example.com" }, { label: "Call", href: "tel:+442079460958" }, { label: "Details", href: "#details" }];
  const keys = Object.keys(COMPOSITIONS).filter((key) => key.startsWith("contact.") && !key.startsWith("contact.form"));
  assert.ok(keys.length >= 3);
  for (const key of keys) for (const cta of variants) {
    if (key === "contact.band" && !cta) continue;
    const c = COMPOSITIONS[key];
    const props = c.props.parse({ title: "Contact", line: "Get in touch", address: "Demo", hours: [], phone: "+44 (20) 7946-0958", email: "hello@example.com", cta });
    const html = renderToStaticMarkup(c.render(props, { tokens: doc.tokens, index: 1 }));
    assert.ok(html.includes('href="tel:+442079460958"'), key);
    assert.ok(html.includes('href="mailto:hello@example.com"'), key);
    if (cta && key !== "contact.big-type") assert.ok(html.includes(`href="${cta.href}"`));
  }
  for (const key of ["contact.split", "contact.band"]) {
    const c = COMPOSITIONS[key];
    const props = c.props.parse({ title: "Contact", line: "Contact", address: "Demo", hours: [], phone: "+44 20 7946 0958", cta: { label: "Email", href: "mailto:legacy@example.com" } });
    const html = renderToStaticMarkup(c.render(props, { tokens: doc.tokens, index: 1 }));
    assert.ok(html.includes('href="tel:+442079460958"'));
    assert.ok(html.includes('href="mailto:legacy@example.com"'), "старый документ без email prop");
  }
  for (const key of keys) for (const fields of [{ phone: "+44 20 7946 0958" }, { email: "hello@example.com" }, {}]) {
    const c = COMPOSITIONS[key];
    const props = c.props.parse({ title: "Contact", line: "Contact", address: "Demo", hours: [], cta: { label: "Details", href: "#details" }, ...fields });
    const html = renderToStaticMarkup(c.render(props, { tokens: doc.tokens, index: 1 }));
    assert.equal(html.includes('href="tel:'), "phone" in fields, key);
    assert.equal(html.includes('href="mailto:'), "email" in fields, key);
  }
});

test("узкая правка не требует устранить старые композиционные замечания", () => {
  const next = structuredClone(doc);
  const hero = next.sections.find((s) => s.composition.startsWith("hero."))!;
  const key = "headline" in (hero.props as Record<string, unknown>) ? "headline" : "statement";
  (hero.props as Record<string, unknown>)[key] = "Bicycle repairs in Hackney";
  const checked = validateEditDoc(next, doc);
  assert.equal(checked.ok, true, JSON.stringify(checked));
  assert.deepEqual(next.sections.map((s) => s.composition), doc.sections.map((s) => s.composition));
  const changes = describeChanges(doc, next);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].area, "hero");
  (hero.props as Record<string, unknown>)[key] = "Unlock your journey with seamless bicycle repairs";
  assert.equal(validateEditDoc(next, doc).ok, false, "новые запрещённые обороты по-прежнему отклоняются");
  const inherited = structuredClone(doc);
  (inherited.sections[2].props as Record<string, unknown>).title = "Unlock your journey";
  const moved = structuredClone(inherited);
  moved.sections.splice(3, 0, ...moved.sections.splice(2, 1));
  assert.equal(validateEditDoc(moved, inherited).ok, true, "перенос старого текста не становится новым замечанием к копирайту");
});

test("дополнительные изменения и метаданные видны в обзоре и HTML", () => {
  const next = applyPatch(doc, { ops: [
    { op: "meta", meta: { title: "New workshop in Hackney", description: "Bicycle servicing and repairs in Hackney." } },
    { op: "move", from: 2, to: 3 },
  ] });
  const after = SiteDocSchema.parse(next.doc);
  const changes = describeChanges(doc, after);
  assert.ok(changes.some((c) => c.area === "meta" && c.after.includes(after.meta.title)));
  assert.ok(changes.filter((c) => c.index !== undefined).length >= 2, "перестановка показана, даже если AI о ней умолчал");
  const html = renderDoc(after);
  assert.ok(html.includes(`<title>${after.meta.title}</title>`));
  assert.ok(html.includes(`content="${after.meta.description}"`));
});

// Полный жизненный цикл предложения, публикации и аккаунта: tests/journey-http.mts.
