// Проверка формата правок «только изменения».
//   prepare <сайт> "<просьба>"  → пишет system.md и user.md для помощника
//   apply <сайт>                 → применяет patch.json, проверяет сайт, сравнивает размер ответа
import { readFileSync, writeFileSync } from "node:fs";
import { validateDoc } from "../experiments/exp1/a/validate";
import { estimateTokens } from "../src/lib/ai/tokens";
import { applyPatch, describeForEdit, type EditPatch } from "../src/lib/sites/patch";

const [cmd, site, request] = process.argv.slice(2);
const D = "docs/demo-sites/edit-test";
const doc = JSON.parse(readFileSync(`docs/demo-sites/outputs/${site}.json`, "utf8"));
if (cmd === "prepare") {
  const system = `${readFileSync("docs/experiment-1c/prompts/system.md", "utf8")}\n\n${readFileSync("src/lib/prompts/edit-patch.md", "utf8")}`;
  const brief = readFileSync(`docs/demo-sites/briefs/${site}.md`, "utf8");
  writeFileSync(`${D}/system.md`, system);
  writeFileSync(`${D}/user.md`, `Business brief:\n${brief}\n\nCurrent site:\n${describeForEdit(doc)}\n\nOwner's request: ${request}`);
  console.log("ok");
} else {
  const raw = readFileSync(`${D}/patch.json`, "utf8");
  const patch = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "")) as EditPatch;
  const applied = applyPatch(doc, patch);
  const check = applied.errors.length ? { ok: false, errors: applied.errors } : validateDoc(applied.doc, undefined, { antiSlop: true });
  console.log(JSON.stringify({ ok: check.ok, errors: "errors" in check ? check.errors : [], reply: patch.reply, ops: patch.ops.map((o) => o.op), patchTokens: estimateTokens(raw), fullDocTokens: estimateTokens(JSON.stringify(doc)) }, null, 1));
  if (check.ok && "doc" in check) writeFileSync(`${D}/result.json`, JSON.stringify(check.doc));
}
