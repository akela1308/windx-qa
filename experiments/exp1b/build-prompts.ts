import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { COMPOSITIONS, SiteDocSchema } from "../exp1/a/schema";
import { directionPrompt, getDirection } from "../exp1/a/directions";
import { directionFor, PLAN, RUNS, type Biz } from "./plan";

// Собирает промпты 1b: системный (библиотека изменилась, поэтому свой)
// и сообщение пользователя для каждого бизнеса и направления.
// Запуск: npx tsx experiments/exp1b/build-prompts.ts

const ROOT = process.cwd();
const P1 = path.join(ROOT, "docs/experiment-1/prompts");
const P = path.join(ROOT, "docs/experiment-1b/prompts");

function catalog(): string {
  const groups = new Map<string, string[]>();
  for (const [key, c] of Object.entries(COMPOSITIONS)) {
    const g = key.split(".")[0];
    groups.set(g, [...(groups.get(g) ?? []), `- \`${key}\`: ${c.description}`]);
  }
  return [...groups].map(([g, lines]) => `### ${g}\n${lines.join("\n")}`).join("\n\n");
}

async function main() {
  const principles = await readFile(path.join(P1, "shared-principles.md"), "utf8");
  const tpl = await readFile(path.join(P1, "a-system.template.md"), "utf8");
  // unrepresentable: "any" — проверки superRefine (рисунок SVG) в JSON Schema не выражаются,
  // их текст есть в описании композиции, а проверяет код.
  const schema = JSON.stringify(z.toJSONSchema(SiteDocSchema, { io: "input", unrepresentable: "any" }));
  const system = tpl.replace("{{PRINCIPLES}}", principles).replace("{{CATALOG}}", catalog()).replace("{{SCHEMA}}", schema);
  await writeFile(path.join(P, "system.md"), system);

  for (const biz of Object.keys(PLAN) as Biz[]) {
    const brief = await readFile(path.join(P, `briefs/${biz}.md`), "utf8");
    for (const run of RUNS) {
      const dir = getDirection(directionFor(biz, run))!;
      await writeFile(path.join(P, `user/${biz}-${run}.md`), `${brief.trim()}\n\n${directionPrompt(dir)}\n`);
    }
  }
  console.log(`system.md: ${system.length} символов, сообщений пользователя: ${3 * RUNS.length}`);
}

main();
