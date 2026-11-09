import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseJsonAnswer } from "../exp1/a/check";
import { getDirection } from "../exp1/a/directions";
import { renderDoc } from "../exp1/a/render-node";
import type { SiteDoc } from "../exp1/a/schema";
import { checkSlop } from "../exp1/a/slop";
import { validateDoc } from "../exp1/a/validate";
import { openBrowser, shoot } from "../exp1/measure/shoot";
import { PLAN, type Biz } from "../exp1b/plan";

// Прогон 1c: проверка → HTML → скриншоты, и сравнение числа AI-приёмов
// с теми же бизнесами и направлениями из 1b. Запуск: npx tsx experiments/exp1c/run.ts

const ROOT = process.cwd();
const C = path.join(ROOT, "docs/experiment-1c");
const RUNS = ["light", "dark", "colour"] as const;

async function load(file: string): Promise<SiteDoc | null> {
  try {
    const r = validateDoc(parseJsonAnswer(await readFile(file, "utf8")));
    return r.ok ? r.doc : null;
  } catch {
    return null;
  }
}

async function main() {
  const { browser, page } = await openBrowser();
  const rows: string[] = [];
  let before = 0, after = 0;
  const cells: string[] = [];
  for (const biz of Object.keys(PLAN) as Biz[]) {
    const dir = path.join(C, `outputs/${biz}`);
    const files = existsSync(dir) ? await readdir(dir) : [];
    const tds: string[] = [];
    for (const run of RUNS) {
      const direction = PLAN[biz][run];
      const old = await load(path.join(ROOT, `docs/experiment-1b/outputs/${biz}/${run}.json`));
      const oldSlop = old ? checkSlop(old).length : NaN;
      let errors: string[] = ["нет ответа"];
      let doc: SiteDoc | null = null;
      if (files.includes(`${run}.json`)) {
        try {
          const r = validateDoc(parseJsonAnswer(await readFile(path.join(dir, `${run}.json`), "utf8")), getDirection(direction), { antiSlop: true });
          errors = r.ok ? [] : r.errors;
          if (r.ok) doc = r.doc;
        } catch (e) {
          errors = [`Невалидный JSON: ${(e as Error).message}`];
        }
      }
      if (doc) {
        const pageFile = path.join(C, `pages/${biz}/${run}.html`);
        await mkdir(path.dirname(pageFile), { recursive: true });
        await mkdir(path.join(C, `screenshots/${biz}`), { recursive: true });
        await writeFile(pageFile, renderDoc(doc));
        const desktop = await shoot(page, pageFile, path.join(C, `screenshots/${biz}/${run}-desktop.jpg`), 1280);
        if (desktop.invisibleText.length) errors.push(`Невидимый текст: ${desktop.invisibleText.join(" | ")}`);
        const mobile = await shoot(page, pageFile, path.join(C, `screenshots/${biz}/${run}-mobile.jpg`), 390);
        if (mobile.scrollWidth > mobile.viewport + 1) errors.push(`На телефоне страница шире экрана: ${mobile.scrollWidth}px`);
      }
      const newSlop = doc ? checkSlop(doc).length : NaN;
      before += oldSlop || 0;
      after += newSlop || 0;
      const attempts = 1 + files.filter((f) => f.startsWith(`${run}.attempt`)).length;
      const bold = doc ? doc.sections.filter((s) => s.composition.startsWith("signature.") || s.composition === "hero.band" || s.composition === "hero.type-poster").map((s) => s.composition.replace("signature.", "")).join(", ") : "–";
      rows.push(`| ${biz} | ${direction} | ${oldSlop} | ${newSlop} | ${attempts} | ${bold} | ${errors.join("; ") || "нет"} |`);
      tds.push(doc ? `<td><a href="pages/${biz}/${run}.html"><img src="screenshots/${biz}/${run}-desktop.jpg" loading="lazy" alt=""></a><br>${direction} · <a href="screenshots/${biz}/${run}-mobile.jpg">телефон</a></td>` : `<td>${errors.join("; ")}</td>`);
      console.log(`${biz} ${run}: ${errors.length ? "ОШИБКИ " + errors.join("; ") : "ok"}`);
    }
    cells.push(`<tr><th>${biz}</th>${tds.join("")}</tr>`);
  }
  await browser.close();

  const md = [
    "# Замеры эксперимента 1c (генерируется скриптом)\n",
    "Число нарушений проверки на AI-приёмы (`experiments/exp1/a/slop.ts`): сайт из 1b против нового сайта 1c с тем же бизнесом и направлением.\n",
    "| Бизнес | Направление | AI-приёмов в 1b | AI-приёмов в 1c | Попыток в 1c | Смелые ходы в 1c | Ошибки 1c |",
    "|---|---|---|---|---|---|---|",
    ...rows,
    `\nВсего AI-приёмов: в 1b ${before}, в 1c ${after}.\n`,
  ];
  await writeFile(path.join(C, "metrics.md"), md.join("\n"));
  await writeFile(
    path.join(C, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Эксперимент 1c</title>
<style>body{font:14px system-ui;margin:20px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;vertical-align:top}
td img{width:260px;height:560px;object-fit:cover;object-position:top;display:block}th{text-align:left}</style>
<h1>Эксперимент 1c: без AI-приёмов, со смелыми ходами</h1>
<p>Те же бизнесы и стили, что в <a href="../1b/">1b</a>, но с правилами из каталога AI-приёмов. Клик открывает сайт целиком.</p>
<table><tr><th></th><th>светлое</th><th>тёмное</th><th>цветное</th></tr>${cells.join("\n")}</table>`,
  );
  console.log("Готово: metrics.md, index.html");
}

main();
