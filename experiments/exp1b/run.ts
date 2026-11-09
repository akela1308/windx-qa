import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseJsonAnswer } from "../exp1/a/check";
import { getDirection, hsl } from "../exp1/a/directions";
import { renderDoc } from "../exp1/a/render-node";
import type { SiteDoc } from "../exp1/a/schema";
import { validateDoc } from "../exp1/a/validate";
import { sequenceDistance, skeleton } from "../exp1/measure/compare";
import type { ProbeResult } from "../exp1/measure/page-probe";
import { openBrowser, shoot } from "../exp1/measure/shoot";
import { directionFor, PLAN, RUNS, type Biz, type RunName } from "./plan";

// Прогон эксперимента 1b: проверка по направлению → HTML → скриншоты → замеры.
// Запуск: npx tsx experiments/exp1b/run.ts

const ROOT = path.join(process.cwd(), "docs/experiment-1b");

type Result = {
  biz: Biz; run: RunName; direction: string; ok: boolean; errors: string[]; attempts: number;
  doc?: SiteDoc; desktop?: ProbeResult; mobile?: ProbeResult;
};

// Разница цветов фона в простых единицах RGB (0 одинаково, ~440 чёрный против белого).
function rgbDistance(a: string, b: string): number {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return Math.round(Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]));
}

async function main() {
  const { browser, page } = await openBrowser();
  const results: Result[] = [];

  for (const biz of Object.keys(PLAN) as Biz[]) {
    const dir = path.join(ROOT, `outputs/${biz}`);
    const files = existsSync(dir) ? await readdir(dir) : [];
    for (const run of RUNS) {
      const direction = directionFor(biz, run);
      const r: Result = { biz, run, direction, ok: false, errors: [], attempts: 1 + files.filter((f) => f.startsWith(`${run}.attempt`)).length };
      if (!files.includes(`${run}.json`)) continue;
      try {
        const check = validateDoc(parseJsonAnswer(await readFile(path.join(dir, `${run}.json`), "utf8")), getDirection(direction));
        if (check.ok) r.doc = check.doc;
        else r.errors = check.errors;
      } catch (e) {
        r.errors = [`Невалидный JSON: ${(e as Error).message}`];
      }
      if (r.doc) {
        const pageFile = path.join(ROOT, `pages/${biz}/${run}.html`);
        const shots = path.join(ROOT, `screenshots/${biz}`);
        await mkdir(path.dirname(pageFile), { recursive: true });
        await mkdir(shots, { recursive: true });
        await writeFile(pageFile, renderDoc(r.doc));
        r.desktop = await shoot(page, pageFile, path.join(shots, `${run}-desktop.jpg`), 1280);
        r.mobile = await shoot(page, pageFile, path.join(shots, `${run}-mobile.jpg`), 390);
        if (r.mobile.scrollWidth > r.mobile.viewport + 1) r.errors.push(`На телефоне страница шире экрана: ${r.mobile.scrollWidth}px`);
      }
      r.ok = r.errors.length === 0;
      results.push(r);
      console.log(`${biz} ${run} (${direction}): ${r.ok ? "ok" : "ОШИБКИ " + r.errors.join("; ")}`);
    }
  }
  await browser.close();
  await writeFile(path.join(ROOT, "metrics.md"), metrics(results));
  await writeFile(path.join(ROOT, "index.html"), gallery(results));
  console.log("Готово: metrics.md, index.html");
}

function metrics(results: Result[]): string {
  const get = (b: Biz, r: RunName) => results.find((x) => x.biz === b && x.run === r && x.doc);
  const md = ["# Замеры эксперимента 1b (генерируется скриптом)\n"];

  md.push("## Каждая страница\n", "| Бизнес | Вариант | Направление | Фон | Шрифты | Скелет | Свой рисунок | Ошибки | Попыток |", "|---|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    const t = r.doc?.tokens;
    const bg = t ? `${t.colors.bg} (L${hsl(t.colors.bg).l.toFixed(0)} S${hsl(t.colors.bg).s.toFixed(0)})` : "–";
    const svg = r.doc?.sections.some((s) => s.composition === "signature.custom-svg") ? "да" : "нет";
    md.push(`| ${r.biz} | ${r.run} | ${r.direction} | ${bg} | ${t ? `${t.displayFont} / ${t.bodyFont}` : "–"} | ${r.desktop ? skeleton(r.desktop).join(" → ") : "–"} | ${svg} | ${r.errors.join("; ") || "нет"} | ${r.attempts} |`);
  }

  md.push("\n## Разные направления у одного бизнеса\n", "| Бизнес | Пара | Разница фона (RGB) | Те же шрифты | Расстояние по скелету |", "|---|---|---|---|---|");
  const pairs: [RunName, RunName][] = [["light", "dark"], ["light", "colour"], ["dark", "colour"], ["light", "repeat"]];
  for (const b of Object.keys(PLAN) as Biz[])
    for (const [x, y] of pairs) {
      const a = get(b, x), c = get(b, y);
      if (!a || !c) continue;
      const sameFonts = a.doc!.tokens.displayFont === c.doc!.tokens.displayFont && a.doc!.tokens.bodyFont === c.doc!.tokens.bodyFont;
      md.push(`| ${b} | ${x} и ${y}${y === "repeat" ? " (то же направление)" : ""} | ${rgbDistance(a.doc!.tokens.colors.bg, c.doc!.tokens.colors.bg)} | ${sameFonts ? "да" : "нет"} | ${sequenceDistance(a.desktop!, c.desktop!).toFixed(2)} |`);
    }

  const law = get("law", "dark"), yoga = get("yoga", "dark");
  if (law && yoga) {
    md.push("\n## Одно направление (deep-ink) у разных бизнесов\n");
    md.push(`Юристы: ${law.doc!.tokens.colors.bg}, ${law.doc!.tokens.displayFont} / ${law.doc!.tokens.bodyFont}. Йога: ${yoga.doc!.tokens.colors.bg}, ${yoga.doc!.tokens.displayFont} / ${yoga.doc!.tokens.bodyFont}. Разница фона ${rgbDistance(law.doc!.tokens.colors.bg, yoga.doc!.tokens.colors.bg)}, скелет ${sequenceDistance(law.desktop!, yoga.desktop!).toFixed(2)}.`);
  }
  const first = results.filter((r) => r.attempts === 1).length;
  md.push(`\nС первой попытки прошли проверку: ${first} из ${results.length}. Ошибки после всех попыток: ${results.filter((r) => !r.ok).length}.`);
  md.push("\nДля сравнения, эксперимент 1: у двух генераций одного бизнеса разница фона была от 2 до 23, шрифты совпали в 4 из 6 пар.\n");
  return md.join("\n") + "\n";
}

function gallery(results: Result[]): string {
  const cell = (b: Biz, run: RunName) => {
    const r = results.find((x) => x.biz === b && x.run === run);
    if (!r?.desktop) return `<td>${r ? "ошибки: " + r.errors.join("; ") : "–"}</td>`;
    return `<td><a href="pages/${b}/${run}.html"><img src="screenshots/${b}/${run}-desktop.jpg" loading="lazy" alt=""></a><br>${r.direction} · <a href="screenshots/${b}/${run}-mobile.jpg">телефон</a>${r.ok ? "" : " · <b>ошибки</b>"}</td>`;
  };
  const rows = (Object.keys(PLAN) as Biz[]).map((b) => `<tr><th>${b}</th>${RUNS.map((r) => cell(b, r)).join("")}</tr>`).join("\n");
  return `<!doctype html><meta charset="utf-8"><title>Эксперимент 1b</title>
<style>body{font:14px system-ui;margin:20px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;vertical-align:top}
td img{width:240px;height:520px;object-fit:cover;object-position:top;display:block}th{text-align:left}</style>
<h1>Эксперимент 1b: сайты в разных визуальных направлениях</h1>
<p>Каждая строка это один бизнес. Колонки: светлое, тёмное и цветное направление, и повтор светлого (проверка, повторяет ли AI сам себя). Клик открывает сайт целиком.</p>
<table><tr><th></th><th>светлое</th><th>тёмное</th><th>цветное</th><th>повтор светлого</th></tr>
${rows}</table>`;
}

main();
