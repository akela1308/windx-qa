import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { SiteDocSchema } from "../experiments/exp1/a/schema";
import { validateDoc } from "../experiments/exp1/a/validate";

test("спокойный сайт без рисунка и с FAQ перед контактами проходит создание", async () => {
  const doc = SiteDocSchema.parse(JSON.parse(await readFile("docs/experiment-1c/outputs/law/light.json", "utf8")));
  doc.sections = doc.sections.filter((s) => !s.composition.startsWith("signature."));
  const faq = doc.sections.find((s) => s.composition === "faq.accordion")!;
  doc.sections = doc.sections.filter((s) => s !== faq);
  doc.sections.splice(doc.sections.findIndex((s) => s.composition.startsWith("contact.")), 0, faq);
  assert.equal(validateDoc(doc, undefined, { antiSlop: true }).ok, true);
  const hero = doc.sections.find((s) => s.composition.startsWith("hero."))!;
  (hero.props as Record<string, unknown>).headline = "Unlock your journey with seamless advice";
  assert.equal(validateDoc(doc, undefined, { antiSlop: true }).ok, false);
  (hero.props as Record<string, unknown>).headline = "Family law in Islington";
  doc.tokens.colors.ink = doc.tokens.colors.bg;
  assert.equal(validateDoc(doc, undefined, { antiSlop: true }).ok, false);
});
