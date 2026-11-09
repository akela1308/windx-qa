import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "docs/research/design-references-2026");
type Source = { id: string; name: string; awardDate: string; awardUrl: string; siteUrl: string; score: number; category: string; previewPath: string; tags: string[] };
type Note = { id: string; pattern: string; asset: string; observation: string; transfer: string };
const corpus = JSON.parse(await readFile(path.join(root, "catalog.json"), "utf8")) as { asOf: string; references: Source[] };
const notes = JSON.parse(await readFile(path.join(root, "annotations.json"), "utf8")) as { references: Note[] };
const byId = new Map(notes.references.map(note => [note.id, note]));
if (corpus.references.length !== 100 || byId.size !== 100 || notes.references.length !== 100) throw Error("Exactly 100 sources and unique annotations are required");
const rows = corpus.references.map(source => {
  const note = byId.get(source.id);
  if (!note) throw Error(`Missing visual review: ${source.id}`);
  return { ...source, ...note };
});

// Only our observations and factual provenance go into the model context.
// Raw source descriptions, HTML, scripts and remote image URLs stay out of it.
const library = { version: 1, asOf: corpus.asOf, evidence: "Submitted award preview, not a live-page or mobile audit", references: rows.map(row => ({
  id:row.id, name:row.name, awardDate:row.awardDate, awardUrl:row.awardUrl,
  siteUrl:row.siteUrl, score:row.score, category:row.category, pattern:row.pattern,
  asset:row.asset, observation:row.observation, transfer:row.transfer,
})) };
await writeFile("src/lib/design/reference-library.json", JSON.stringify(library, null, 2) + "\n");

const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const categories = [...new Set(rows.map(row => row.category))].sort();
const options = categories.map(c => `<option>${esc(c)}</option>`).join("");
const cards = rows.map((r, i) => `<article data-category="${esc(r.category)}" data-search="${esc([r.name,r.category,r.pattern,r.observation,r.transfer].join(" ").toLowerCase())}">
<a href="${esc(r.awardUrl)}" target="_blank" rel="noopener noreferrer"><img src="${esc(r.previewPath)}" alt="Award preview: ${esc(r.name)}" loading="lazy" width="740" height="480"></a>
<div class="body"><p class="meta">${String(i + 1).padStart(3,"0")} · ${r.awardDate} · ${r.score.toFixed(2)} / 10</p><h2>${esc(r.name)}</h2><p class="tags">${esc(r.category)} · ${esc(r.pattern)} · visual: ${esc(r.asset)}</p><p>${esc(r.observation)}</p><p class="transfer"><strong>Приём для WINDX:</strong> ${esc(r.transfer)}</p><p class="links"><a href="${esc(r.siteUrl)}" target="_blank" rel="noopener noreferrer">Сайт ↗</a><a href="${esc(r.awardUrl)}" target="_blank" rel="noopener noreferrer">Награда и дата ↗</a></p></div></article>`).join("\n");
await writeFile(path.join(root,"index.html"), `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WINDX · 100 дизайн-референсов 2026</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f1f3f5;color:#182126;font:16px/1.55 system-ui,sans-serif}header,main{max-width:1500px;margin:auto;padding:32px 24px}header{padding-top:56px}h1{max-width:900px;font-size:clamp(32px,5vw,64px);line-height:1.08;letter-spacing:-.04em;margin:12px 0 24px}header p{max-width:900px}.eyebrow{color:#355653;font-weight:700}.controls{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}input,select{padding:12px;border:1px solid #a7b4b9;background:white;font:inherit;max-width:100%}input{flex:1;min-width:200px}#count{align-self:center}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}article{background:white;border:1px solid #d7dfe2;min-width:0}article[hidden]{display:none}article img{display:block;width:100%;height:auto;aspect-ratio:740/480;object-fit:contain;background:#e4e8eb}.body{padding:20px}h2{font-size:23px;line-height:1.2;margin:8px 0 12px}.meta,.tags{font-size:13px;color:#48616a}.transfer{padding-top:14px;border-top:1px solid #d7dfe2}.links{display:flex;flex-wrap:wrap;gap:16px}a{color:#124b43;text-underline-offset:3px}a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #b3481c;outline-offset:3px}@media(max-width:1050px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.grid{grid-template-columns:1fr}header,main{padding:24px 16px}h1{margin-top:12px}}</style>
<header><div class="eyebrow">WINDX / VISUAL RESEARCH / ${corpus.asOf}</div><h1>100 сайтов.<br>Конкретные приёмы вместо одного шаблона.</h1><p>Подборка победителей CSS Design Awards Website of the Day за 2026 год на 6 ноября. Из 296 найденных карточек проверены 170 кандидатов с высокими оценками; выбраны 100 разных доменов с балансом по 18 категориям. Это исследовательская подборка, а не официальный мировой топ и не итог завершённого года.</p><p>Каждое превью просмотрено и снабжено наблюдением и приёмом для переноса. Описание приёмов на английском совпадает с библиотекой генератора. Превью предоставлены на странице премии; часть содержит макеты устройств. Это не проверка текущего сайта, мобильной версии, анимации или доступности. Чужие фото, тексты, логотипы и код не становятся материалами сайтов WINDX.</p><div class="controls"><input id="q" type="search" aria-label="Поиск референсов" placeholder="Название, приём или визуальный материал"><select id="category" aria-label="Категория"><option value="">Все категории</option>${options}</select><output id="count" aria-live="polite">100 / 100</output></div></header><main><div class="grid">${cards}</div></main>
<script>const q=document.querySelector('#q'),category=document.querySelector('#category'),cards=[...document.querySelectorAll('article')];function filter(){let n=0;for(const card of cards){card.hidden=!!((category.value&&card.dataset.category!==category.value)||(q.value.trim()&&!card.dataset.search.includes(q.value.trim().toLowerCase())));if(!card.hidden)n++}document.querySelector('#count').textContent=n+' / 100'}q.addEventListener('input',filter);category.addEventListener('change',filter);</script></html>\n`);
console.log(`Built gallery and runtime library: ${rows.length} reviewed references, ${categories.length} categories.`);
