import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { estimateTokens } from "../../src/lib/ai/provider";
import type { Run } from "./run";
import { sameCharacter, sequenceDistance, skeleton, vocabularyDistance } from "./measure/compare";

// Сводные цифры эксперимента: metrics.json (всё), metrics.md (таблицы для отчёта),
// index.html (все скриншоты на одной странице для просмотра глазами).

const ROOT = path.join(process.cwd(), "docs/experiment-1");
// ГИПОТЕЗА: прайс Claude Sonnet $3 за миллион входных токенов и $15 за миллион выходных,
// чтение из кэша промпта 10% от входной цены. Сверить с актуальным прайсом на этапе 7.
const PRICE = { input: 3 / 1e6, output: 15 / 1e6, cachedInput: 0.3 / 1e6 };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const f2 = (x: number) => (Number.isNaN(x) ? "–" : x.toFixed(2));
const usd = (x: number) => `$${x.toFixed(3)}`;

function find(runs: Run[], a: string, biz: string, step: string) {
  return runs.find((r) => r.approach === a && r.biz === biz && r.step === step && r.desktop);
}

function cost(r: Run, systemTokens: number, cached: boolean) {
  const user = r.inputTokens - systemTokens * r.attempts;
  const sys = systemTokens * r.attempts * (cached ? PRICE.cachedInput : PRICE.input);
  return sys + user * PRICE.input + r.outputTokens * PRICE.output;
}

export async function writeReportData(runs: Run[]) {
  const bizs = ["bike", "law", "yoga"];
  const md: string[] = ["# Замеры эксперимента 1 (генерируется скриптом, не править руками)\n"];
  const summary: Record<string, unknown> = {};

  for (const a of ["A", "B"]) {
    const mine = runs.filter((r) => r.approach === a);
    if (!mine.length) continue;
    md.push(`## Подход ${a}\n`);

    // 1. Разнообразие между бизнесами и между двумя генерациями одного бизнеса.
    const cross: number[] = [];
    const crossVocab: number[] = [];
    for (const g of ["gen1", "gen2"])
      for (let i = 0; i < 3; i++)
        for (let j = i + 1; j < 3; j++) {
          const x = find(runs, a, bizs[i], g), y = find(runs, a, bizs[j], g);
          if (x && y) { cross.push(sequenceDistance(x.desktop!, y.desktop!)); crossVocab.push(vocabularyDistance(x.desktop!, y.desktop!)); }
        }
    md.push("| Сравнение | Расстояние по порядку блоков | Расстояние по набору приёмов | Тот же набор шрифтов | Почти тот же фон |", "|---|---|---|---|---|");
    md.push(`| Разные бизнесы (среднее по парам) | ${f2(avg(cross))} | ${f2(avg(crossVocab))} | | |`);
    const within: number[] = [];
    for (const b of bizs) {
      const x = find(runs, a, b, "gen1"), y = find(runs, a, b, "gen2");
      if (!x || !y) continue;
      const d = sequenceDistance(x.desktop!, y.desktop!);
      within.push(d);
      const c = sameCharacter(x.desktop!, y.desktop!);
      md.push(`| ${b}: gen1 и gen2 | ${f2(d)} | ${f2(vocabularyDistance(x.desktop!, y.desktop!))} | ${c.font ? "да" : "нет"} | ${c.bg ? "да" : "нет"} |`);
    }
    md.push("\n0 значит одинаковый скелет страницы, 1 значит ничего общего.\n");

    // 2. Скелеты всех страниц и найденные сетки карточек.
    md.push("| Бизнес | Шаг | Скелет страницы (сверху вниз) | Сетки карточек | Ошибки | Попыток |", "|---|---|---|---|---|---|");
    for (const r of mine) {
      const grids = r.desktop?.cardGrids.map((g) => `${g.icon ? "С ИКОНКАМИ" : "без иконок"} ×${g.count}`).join(", ") || "нет";
      md.push(`| ${r.biz} | ${r.step} | ${r.desktop ? skeleton(r.desktop).join(" → ") : "не отрисовано"} | ${grids} | ${r.errors.join("; ") || "нет"} | ${r.attempts} |`);
    }

    // 3. Цепочка правок: насколько менялся скелет на каждом шаге.
    md.push("\n| Бизнес | gen1→edit1 | edit1→edit2 | edit2→edit3 |", "|---|---|---|---|");
    for (const b of bizs) {
      const chain = ["gen1", "edit1", "edit2", "edit3"].map((s) => find(runs, a, b, s));
      const ds = [0, 1, 2].map((i) => (chain[i] && chain[i + 1] ? f2(sequenceDistance(chain[i]!.desktop!, chain[i + 1]!.desktop!)) : "–"));
      md.push(`| ${b} | ${ds.join(" | ")} |`);
    }

    // 4. Токены и деньги (оценка).
    const sysTokens = estimateTokens(await readFile(path.join(ROOT, `prompts/compiled/${a.toLowerCase()}-system.md`), "utf8"));
    const gens = mine.filter((r) => r.step.startsWith("gen"));
    const edits = mine.filter((r) => r.step.startsWith("edit"));
    const cycle = (cached: boolean) => avg(bizs.map((b) => edits.filter((r) => r.biz === b).reduce((s, r) => s + cost(r, sysTokens, cached), 0)).filter((x) => x > 0));
    md.push("\n| Деньги и токены (оценка) | Значение |", "|---|---|");
    md.push(`| Системный промпт, токенов | ${sysTokens} |`);
    md.push(`| Генерация: вход / выход, токенов в среднем | ${Math.round(avg(gens.map((r) => r.inputTokens)))} / ${Math.round(avg(gens.map((r) => r.outputTokens)))} |`);
    md.push(`| Одна генерация, без кэша / с кэшем промпта | ${usd(avg(gens.map((r) => cost(r, sysTokens, false))))} / ${usd(avg(gens.map((r) => cost(r, sysTokens, true))))} |`);
    md.push(`| Цикл из трёх правок, без кэша / с кэшем | ${usd(cycle(false))} / ${usd(cycle(true))} |`);

    // 5. Предсказуемость.
    const firstTry = mine.filter((r) => r.attempts === 1).length;
    md.push(`\nС первой попытки прошли проверку: ${firstTry} из ${mine.length}. Ошибки, которые видны только в браузере (проверка при генерации их не ловит): ${mine.filter((r) => !r.ok).length}.\n`);

    summary[a] = { crossBusiness: avg(cross), withinBusiness: avg(within), iconCardGrids: mine.filter((r) => r.desktop?.cardGrids.some((g) => g.icon)).length, firstTry, total: mine.length };
  }

  await writeFile(path.join(ROOT, "metrics.md"), md.join("\n") + "\n");
  await writeFile(path.join(ROOT, "metrics.json"), JSON.stringify({ summary, runs }, null, 1));
  await writeFile(path.join(ROOT, "index.html"), gallery(runs));
  console.log("Готово: metrics.md, metrics.json, index.html");
}

// Простая страница для просмотра: по строке на бизнес и подход, по колонке на шаг.
function gallery(runs: Run[]): string {
  const cells = (a: string, b: string) =>
    ["gen1", "gen2", "edit1", "edit2", "edit3"]
      .map((s) => {
        const r = runs.find((x) => x.approach === a && x.biz === b && x.step === s);
        if (!r?.desktop) return `<td>${r ? "не отрисовано" : "–"}</td>`;
        return `<td><a href="pages/${a}/${b}/${s}.html"><img src="screenshots/${a}/${b}/${s}-desktop.jpg" loading="lazy"></a><br><a href="screenshots/${a}/${b}/${s}-mobile.jpg">телефон</a>${r.ok ? "" : " · <b>ошибки</b>"}</td>`;
      })
      .join("");
  const rows = ["A", "B"].flatMap((a) => ["bike", "law", "yoga"].map((b) => `<tr><th>${a} · ${b}</th>${cells(a, b)}</tr>`)).join("\n");
  return `<!doctype html><meta charset="utf-8"><title>Эксперимент 1</title>
<style>body{font:14px system-ui;margin:20px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;vertical-align:top}
td img{width:220px;height:480px;object-fit:cover;object-position:top;display:block}th{text-align:left}</style>
<h1>Эксперимент 1: все варианты</h1><p>Клик по картинке открывает страницу целиком.</p>
<table><tr><th></th><th>gen1</th><th>gen2</th><th>edit1: hero calmer</th><th>edit2: services differently</th><th>edit3: memorable element</th></tr>
${rows}</table>`;
}
