import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { COMPOSITIONS, SiteDocSchema } from "../exp1/a/schema";
import { directionPrompt, getDirection } from "../exp1/a/directions";
import { PLAN, type Biz } from "../exp1b/plan";

// Промпты 1c: те же направления, что в 1b (без повтора), плюс правила
// против AI-приёмов (prompts/anti-slop-rules.md) и обновлённая библиотека.
// Запуск: npx tsx experiments/exp1c/build-prompts.ts

const ROOT = process.cwd();
const P1 = path.join(ROOT, "docs/experiment-1/prompts");
const P = path.join(ROOT, "docs/experiment-1c/prompts");
export const RUNS_1C = ["light", "dark", "colour"] as const;

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
  const antiSlop = await readFile(path.join(P, "anti-slop-rules.md"), "utf8");
  const quality = await readFile(path.join(ROOT, "src/lib/prompts/design-quality.md"), "utf8");
  const tpl = await readFile(path.join(P1, "a-system.template.md"), "utf8");
  const schema = JSON.stringify(z.toJSONSchema(SiteDocSchema, { io: "input", unrepresentable: "any" }));
  const system = tpl
    .replace("{{PRINCIPLES}}", `${principles}\n${antiSlop}\n${quality}`)
    .replace("{{CATALOG}}", catalog())
    .replace("{{SCHEMA}}", schema)
    .replace("Not every section needs a label.", "");
  await writeFile(path.join(P, "system.md"), system);

  for (const biz of Object.keys(PLAN) as Biz[]) {
    const brief = await readFile(path.join(P, `briefs/${biz}.md`), "utf8");
    for (const run of RUNS_1C) {
      await writeFile(path.join(P, `user/${biz}-${run}.md`), `${brief.trim()}\n\n${directionPrompt(getDirection(PLAN[biz][run])!)}\n`);
    }
  }
  console.log(`system.md: ${system.length} символов`);
}

main();
