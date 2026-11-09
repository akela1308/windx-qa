import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { COMPOSITIONS, SiteDocSchema } from "./a/schema";

// Собирает итоговые системные промпты из шаблонов.
// Для подхода A каталог и JSON Schema берутся прямо из кода,
// поэтому промпт не может разойтись с библиотекой композиций.

const P = path.join(process.cwd(), "docs/experiment-1/prompts");

function catalog(): string {
  const groups = new Map<string, string[]>();
  for (const [key, c] of Object.entries(COMPOSITIONS)) {
    const g = key.split(".")[0];
    groups.set(g, [...(groups.get(g) ?? []), `- \`${key}\`: ${c.description}`]);
  }
  return [...groups].map(([g, lines]) => `### ${g}\n${lines.join("\n")}`).join("\n\n");
}

async function main() {
  const principles = await readFile(path.join(P, "shared-principles.md"), "utf8");
  const aTpl = await readFile(path.join(P, "a-system.template.md"), "utf8");
  const bTpl = await readFile(path.join(P, "b-system.template.md"), "utf8");
  const schema = JSON.stringify(z.toJSONSchema(SiteDocSchema, { io: "input" }));

  await mkdir(path.join(P, "compiled"), { recursive: true });
  const a = aTpl.replace("{{PRINCIPLES}}", principles).replace("{{CATALOG}}", catalog()).replace("{{SCHEMA}}", schema);
  const b = bTpl.replace("{{PRINCIPLES}}", principles);
  await writeFile(path.join(P, "compiled/a-system.md"), a);
  await writeFile(path.join(P, "compiled/b-system.md"), b);
  console.log(`a-system.md: ${a.length} символов, b-system.md: ${b.length} символов`);
}

main();
