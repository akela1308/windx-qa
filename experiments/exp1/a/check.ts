import { readFileSync } from "node:fs";
import { validateDoc } from "./validate";
import { getDirection } from "./directions";

// Проверка одного ответа подхода A из командной строки:
// npx tsx experiments/exp1/a/check.ts file.json [--direction id] [--anti-slop]

export function parseJsonAnswer(text: string): unknown {
  // Модели иногда оборачивают JSON в ```json ... ```, снимаем обёртку.
  const stripped = text.trim().replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  return JSON.parse(stripped);
}

if (process.argv[1]?.endsWith("check.ts") && process.argv[2]) {
  let raw: unknown;
  try {
    raw = parseJsonAnswer(readFileSync(process.argv[2], "utf8"));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, errors: [`Невалидный JSON: ${(e as Error).message}`] }, null, 2));
    process.exit(1);
  }
  const dirArg = process.argv.indexOf("--direction");
  const direction = dirArg > 0 ? getDirection(process.argv[dirArg + 1]) : undefined;
  if (dirArg > 0 && !direction) throw new Error(`Unknown direction ${process.argv[dirArg + 1]}`);
  const r = validateDoc(raw, direction, { antiSlop: process.argv.includes("--anti-slop") });
  console.log(JSON.stringify(r.ok ? { ok: true, warnings: r.warnings } : r, null, 2));
  process.exit(r.ok ? 0 : 1);
}
