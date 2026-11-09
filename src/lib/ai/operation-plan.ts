import { templateReference } from "@/lib/catalog";
import { fontCharacterCatalogue } from "../../../experiments/exp1/a/font-character";
import { designReferenceContext } from "@/lib/design/references";
import { creationAssetsContext, type CreationAsset } from "@/lib/design/visual-plan";
import { createHash } from "node:crypto";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { creationModel, editingModel } from "./models";
import { isLiveAi } from "./provider";
import { responseLanguagePrompt } from "./response-language";
import { DESIGN_PROMPTS, directionPrompt, getDirection, type SiteDoc } from "@/lib/design";
import { describeForEdit } from "@/lib/sites/patch";
import type { AiEstimate } from "./estimate-types";
export const CREATE_OUTPUT = 16000, EDIT_OUTPUT = 8000;
const REPAIR_BYTES = 16000;
export type OperationPlan = { fingerprint: string; system: string; user?: string; steps: {model: string; count: number; maxOutput: number; inputBytes: number}[]; summary: Omit<AiEstimate, "id" | "expiresAt"> };
export async function creationSystem(locale: string) {
  return `${await readFile(DESIGN_PROMPTS.system,"utf8")}\n\n${await readFile(DESIGN_PROMPTS.outputRules,"utf8")}\n\n${await readFile(path.join(process.cwd(),"src/lib/prompts/creation-first-result.md"),"utf8")}\n\n${await readFile(path.join(process.cwd(),"src/lib/prompts/visual-character.md"),"utf8")}\n\n${await readFile(path.join(process.cwd(),"src/lib/prompts/design-references.md"),"utf8")}\n\n${await readFile(path.join(process.cwd(),"src/lib/prompts/visual-plan.md"),"utf8")}\n\n${fontCharacterCatalogue()}\n\n${await responseLanguagePrompt(locale)}`;
}
export async function editingSystem(locale: string) {
  return `${await readFile(DESIGN_PROMPTS.system,"utf8")}\n\n${await readFile(DESIGN_PROMPTS.editPatch,"utf8")}\n\n${await responseLanguagePrompt(locale)}`;
}
export const editUser = (brief: string, doc: SiteDoc, request: string) => `Business brief:\n${brief}\n\nCurrent site:\n${describeForEdit(doc)}\n\nOwner's request: ${request}`;
function finish(action: "create" | "edit", context: unknown, system: string, steps: OperationPlan["steps"], includesStyle: boolean): OperationPlan {
  const demo = !isLiveAi();
  const inputHigh = steps.reduce((n,s)=>n+s.inputBytes*s.count,0);
  const inputLow = steps.reduce((n,s)=>n+Math.ceil(Math.max(0,s.inputBytes-REPAIR_BYTES)/4),0);
  // Free beta creation: the Create click authorises this bounded operation. Paid creation must use confirmation-required.
  const summary = {action, ...(action === "create" ? {customerCharge: "none" as const} : {}), demo, inputLow, inputHigh, outputMax: steps.reduce((n,s)=>n+s.maxOutput*s.count,0), requestsMax: steps.reduce((n,s)=>n+s.count,0), includesStyle};
  return {system, steps, summary, fingerprint: createHash("sha256").update(JSON.stringify({context, system, steps, summary})).digest("hex")};
}
// Without an explicit UI style, the main model designs directly from the brief.
// Do not prepend a classifier's mandatory direction or a default that can contradict it.
export function creationUser(brief: string, style?: string) {
  const direction = style ? getDirection(style) : undefined;
  return direction ? `${brief}\n\n${directionPrompt(direction)}` : brief;
}
export function referencedCreationUser(brief: string, style?: string, assets:readonly CreationAsset[]=[]) {
  return creationUser(brief, style) + designReferenceContext(brief) + creationAssetsContext(assets);
}
export async function planCreation(brief: string, style: string | undefined, locale: string, template?: string, assets:readonly CreationAsset[]=[]) {
  const selectedTemplate = await templateReference(template);
  const system = await creationSystem(locale), user = selectedTemplate
    ? creationUser(brief, style) + selectedTemplate + creationAssetsContext(assets)
    : referencedCreationUser(brief, style, assets);
  const steps = [{model: creationModel(), count: 2, maxOutput: CREATE_OUTPUT, inputBytes: Buffer.byteLength(system+user)+REPAIR_BYTES+1024}];
  return {...finish("create", {brief,style,locale,user},system,steps,false),user};
}
export async function planEdit(brief: string, doc: SiteDoc, request: string, locale: string, version: number, siteId: string) {
  const system = await editingSystem(locale), user = editUser(brief,doc,request);
  return finish("edit", {siteId,brief,doc,request,locale,version},system,[{model: editingModel(), count: 2, maxOutput: EDIT_OUTPUT, inputBytes: Buffer.byteLength(system+user)+REPAIR_BYTES+1024}],false);
}
