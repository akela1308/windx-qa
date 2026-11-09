import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SiteDocSchema, type SiteDoc } from "../exp1/a/schema";
import { renderDoc } from "../exp1/a/render-node";
import { validateDoc } from "../exp1/a/validate";

// Контролируемые варианты из готовых примеров, без вызова платной модели.
// Проверяем неизменность содержательных текстов, метаданных и реестра фактов.
const root = path.join(process.cwd(), "docs/design-quality-study-2026-10-29");
await mkdir(root, { recursive: true });
const names = { bike: "Мастерская", law: "Юридическая практика", yoga: "Студия йоги" };
const results = [];
for (const biz of ["bike", "law", "yoga"] as const) {
  const before = SiteDocSchema.parse(JSON.parse(await readFile(`docs/experiment-1c/outputs/${biz}/light.json`, "utf8")));
  const after = structuredClone(before);
  if (biz === "law") {
    after.sections = after.sections.filter((s) => !s.composition.startsWith("signature."));
    after.tokens.bodyFont = "public-sans";
    after.tokens.scale = "modest";
    after.rationale = "The service table and first-call explanation lead the page. A restrained heading scale and a distinct sans-serif body role support scanning without adding a separate giant figure, door illustration or marked slogan. The substantive sections and facts remain unchanged.";
  }
  if (biz === "yoga") {
    after.sections = after.sections.filter((s) => !["signature.custom-svg", "signature.marked-line"].includes(s.composition));
    const header = after.sections[0].props as { links: { href: string }[] };
    header.links.forEach((link) => { if (link.href === "#room") link.href = "#hello"; });
    after.rationale = "Warm colour and serif headings retain the studio's character. The classes and Mei's personal note carry the page without repeating the mat count as a separate band or presenting an invented floor plan. The room link now points to its existing description in the hero.";
  }
  // Мастерская служит контролем: выразительность не отменяется автоматически.
  const content = (doc: SiteDoc) => JSON.stringify(doc.sections.filter((s) => !s.composition.startsWith("signature.")))
    .replaceAll('"#room"', '"#hello"');
  assert.equal(content(before), content(after), `${biz}: содержательные разделы изменились`);
  assert.deepEqual(before.meta, after.meta);
  assert.deepEqual(before.factsToConfirm, after.factsToConfirm);
  for (const [variant, doc] of [["before", before], ["after", after]] as const) {
    const checked = validateDoc(doc, undefined, { antiSlop: true });
    assert.ok(checked.ok, `${biz}/${variant}: ${JSON.stringify(checked)}`);
    await writeFile(path.join(root, `${biz}-${variant}.json`), JSON.stringify(doc, null, 2) + "\n");
    await writeFile(path.join(root, `${biz}-${variant}.html`), renderDoc(doc));
  }
  const removed = before.sections.filter((s) => !after.sections.some((a) => JSON.stringify(a) === JSON.stringify(s)) && s.composition.startsWith("signature."));
  const signatures = after.sections.filter((s) => s.composition.startsWith("signature.")).length;
  results.push({ business: biz, coreContentUnchanged: true, metadataUnchanged: true, factsUnchanged: true,
    removed: removed.map((s) => ({ composition: s.composition, props: s.props })),
    retainedSignatures: signatures,
    legacyQuotaWouldReject: signatures < 2 || !after.sections.some((s) => s.composition === "signature.custom-svg") });
}
await writeFile(path.join(root, "checks.json"), JSON.stringify(results, null, 2) + "\n");
await writeFile(path.join(root, "index.html"), `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Сравнение композиции WINDX</title><style>
body{font:16px/1.5 system-ui;margin:0;background:#f5f3ef;color:#1d211e}main{max-width:1400px;margin:auto;padding:24px}h1{font-size:32px;line-height:1.15}h2{margin-top:48px}p{max-width:80ch}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}.pane{overflow:auto;background:white;border:1px solid #bbb}iframe{display:block;width:100%;height:850px;border:0}a{color:#21492d}button{padding:12px;margin-right:8px;cursor:pointer}body.mobile iframe{width:390px}body.mobile .pair{grid-template-columns:repeat(2,minmax(0,1fr))}@media(max-width:850px){.pair,body.mobile .pair{grid-template-columns:1fr}}
</style><main><h1>Композиция по задаче бизнеса</h1><p>Локальное сравнение готовых примеров. Это демонстрация дизайнерских решений, подготовленная Codex в сессии, без платного API и без слепой оценки. Фото остаются обозначенными местами для материалов владельца. Ссылки и неподтверждённые факты примеров не предназначены для публикации.</p><p>Содержательные разделы, метаданные и реестр фактов сохранены. Варианты отличаются украшениями с их подписями; у юридической практики также изменены основной шрифт и масштаб заголовков. Мастерская оставлена контрольной парой без изменений.</p><button onclick="document.body.classList.remove('mobile')">По ширине панели</button><button onclick="document.body.classList.add('mobile')">Телефон 390 px</button>${Object.entries(names).map(([biz, name]) => `<h2>${name}</h2><div class="pair">${["before", "after"].map((v) => `<div><p><a href="${biz}-${v}.html">${v === "before" ? "Исходный пример 1c" : "Вариант по рабочим принципам"}, открыть отдельно</a></p><div class="pane"><iframe loading="lazy" src="${biz}-${v}.html" title="${name}: ${v}"></iframe></div></div>`).join("")}</div>`).join("")}</main></html>`);
console.log("Сравнение готово: 3 пары; тексты, метаданные и факты сохранены.");
