import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getProvider } from "../../src/lib/ai/provider";
import { parseJsonAnswer } from "./a/check";
import { renderDoc } from "./a/render-node";
import { validateDoc } from "./a/validate";
import { lintHtml } from "./b/lint";
import type { ProbeResult } from "./measure/page-probe";
import { openBrowser, shoot } from "./measure/shoot";
import { writeReportData } from "./summarize";

// Прогон эксперимента: ответы модели (через слой-посредник, сейчас заглушка)
// → проверка → HTML → скриншоты → замеры. Запуск: npm run exp1

export const ROOT = path.join(process.cwd(), "docs/experiment-1");
export const BUSINESSES = ["bike", "law", "yoga"] as const;
export const STEPS = ["gen1", "gen2", "edit1", "edit2", "edit3"] as const;
const EDITS: Record<string, string> = {
  edit1: "Make the hero calmer.",
  edit2: "Show the services differently.",
  edit3: "Add a memorable visual element that suits this business.",
};

export type Run = {
  approach: "A" | "B";
  biz: string;
  step: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
  attempts: number; // 1 = прошло с первого раза, 2 = понадобился повтор
  inputTokens: number;
  outputTokens: number;
  desktop?: ProbeResult;
  mobile?: ProbeResult;
};

async function text(p: string) {
  return readFile(p, "utf8");
}

async function buildRequest(approach: "A" | "B", biz: string, step: string) {
  const ext = approach === "A" ? "json" : "html";
  const system = await text(path.join(ROOT, `prompts/compiled/${approach.toLowerCase()}-system.md`));
  const brief = await text(path.join(ROOT, `prompts/briefs/${biz}.md`));
  if (step.startsWith("gen")) return { system, user: brief, fixtureKey: `experiment-1/outputs/${approach}/${biz}/${step}.${ext}` };
  // Правка: модель получает текущую версию сайта и просьбу владельца.
  const prevStep = step === "edit1" ? "gen1" : `edit${Number(step.slice(-1)) - 1}`;
  const prev = await text(path.join(ROOT, `outputs/${approach}/${biz}/${prevStep}.${ext}`));
  const editRules = (await text(path.join(ROOT, "prompts/edits.md"))).split("## Edit instruction")[1];
  return {
    system: `${system}\n\n## Edit instruction${editRules}`,
    user: `Business brief:\n${brief}\n\nCurrent site:\n${prev}\n\nOwner's request: ${EDITS[step]}`,
    fixtureKey: `experiment-1/outputs/${approach}/${biz}/${step}.${ext}`,
  };
}

async function main() {
  const provider = getProvider();
  const { browser, page } = await openBrowser();
  const runs: Run[] = [];

  for (const approach of ["A", "B"] as const) {
    for (const biz of BUSINESSES) {
      const outDir = path.join(ROOT, `outputs/${approach}/${biz}`);
      if (!existsSync(outDir)) continue;
      const files = await readdir(outDir);
      for (const step of STEPS) {
        const ext = approach === "A" ? "json" : "html";
        if (!files.includes(`${step}.${ext}`)) continue;
        const req = await buildRequest(approach, biz, step);
        const res = await provider.complete(req);
        const attempts = 1 + files.filter((f) => f.startsWith(`${step}.attempt`)).length;
        const run: Run = { approach, biz, step, ok: false, errors: [], warnings: [], attempts, inputTokens: res.usage.inputTokens * attempts, outputTokens: res.usage.outputTokens * attempts };

        let html: string | undefined;
        if (approach === "A") {
          try {
            const check = validateDoc(parseJsonAnswer(res.text));
            if (check.ok) {
              html = renderDoc(check.doc);
              run.warnings = check.warnings;
            } else run.errors = check.errors;
          } catch (e) {
            run.errors = [`Невалидный JSON: ${(e as Error).message}`];
          }
        } else {
          const lint = lintHtml(res.text);
          run.errors = lint.errors;
          run.warnings = lint.warnings;
          html = res.text; // страницу рисуем даже с ошибками, чтобы видеть, что сломалось
        }

        if (html) {
          const pageFile = path.join(ROOT, `pages/${approach}/${biz}/${step}.html`);
          const shotDir = path.join(ROOT, `screenshots/${approach}/${biz}`);
          await mkdir(path.dirname(pageFile), { recursive: true });
          await mkdir(shotDir, { recursive: true });
          await writeFile(pageFile, html);
          run.desktop = await shoot(page, pageFile, path.join(shotDir, `${step}-desktop.jpg`), 1280);
          run.mobile = await shoot(page, pageFile, path.join(shotDir, `${step}-mobile.jpg`), 390);
          if (run.mobile.scrollWidth > run.mobile.viewport + 1) run.errors.push(`На телефоне страница шире экрана: ${run.mobile.scrollWidth}px`);
        }
        run.ok = run.errors.length === 0;
        runs.push(run);
        console.log(`${approach} ${biz} ${step}: ${run.ok ? "ok" : "ОШИБКИ " + run.errors.join("; ")}`);
      }
    }
  }
  await browser.close();
  await writeReportData(runs);
}

main();
