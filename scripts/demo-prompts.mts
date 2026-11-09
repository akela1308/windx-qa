// Сообщения пользователя для демо-сайтов: описание бизнеса плюс блок направления.
// Запуск: npx tsx scripts/demo-prompts.mts
import { readFileSync, writeFileSync } from "node:fs";
import { directionPrompt, getDirection } from "../experiments/exp1/a/directions";

// Бизнес → направление (подобрано вручную по характеру бизнеса).
export const DEMO_PLAN: Record<string, string> = {
  dentist: "swiss", florist: "poster-duo", plumber: "signal", cafe: "monotone",
  electrician: "newsprint", tattoo: "night-shift", tutor: "warm-editorial",
};
for (const [biz, dir] of Object.entries(DEMO_PLAN)) {
  const brief = readFileSync(`docs/demo-sites/briefs/${biz}.md`, "utf8").trim();
  writeFileSync(`docs/demo-sites/user/${biz}.md`, `${brief}\n\n${directionPrompt(getDirection(dir)!)}\n`);
}
console.log("ok");
