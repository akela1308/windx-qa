import path from "node:path";

// «Розетка» для дизайна клиентских сайтов. Кабинет знает только это:
// тип документа сайта, проверку ответа AI, рендер в HTML и путь к промпту.
//
// ГИПОТЕЗА: сейчас подключён подход A из эксперимента 1 (документ по схеме +
// библиотека композиций). Окончательный выбор будет после эксперимента 1b.
// Если подход сменится, меняются только этот файл и render.ts.
// Рендер в HTML вынесен в render.ts: Next.js не разрешает тянуть react-dom/server
// в код экранов, он нужен только обработчику превью.

export { validateDoc } from "../../../experiments/exp1/a/validate";
export { parseJsonAnswer } from "../../../experiments/exp1/a/check";
export type { SiteDoc } from "../../../experiments/exp1/a/schema";
export { DIRECTIONS, directionPrompt, getDirection } from "../../../experiments/exp1/a/directions";
export type { Direction } from "../../../experiments/exp1/a/directions";

export const DESIGN_PROMPTS = {
  // Лучший на сегодня промпт: направления и правила против AI-приёмов (эксперимент 1c).
  system: path.join(process.cwd(), "docs/experiment-1c/prompts/system.md"),
  edits: path.join(process.cwd(), "docs/experiment-1/prompts/edits.md"),
  // Экономия: компактный ответ при создании и правки списком изменений.
  outputRules: path.join(process.cwd(), "src/lib/prompts/output-rules.md"),
  editPatch: path.join(process.cwd(), "src/lib/prompts/edit-patch.md"),
};
