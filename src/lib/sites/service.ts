import { creationCharacterErrors } from "@/lib/design/creation-character";
import { creationVisualErrors, fitCreationImages, VISUAL_PLAN_CONTRACT,type CreationAsset } from "@/lib/design/visual-plan";
import { creationModel, editingModel } from "@/lib/ai/models";
import { getDict } from "@/lib/i18n";
import { demoCreationReply } from "@/lib/ai/response-language";
import { duplicateImages } from "@/lib/media/files";
import {domainService} from "@/lib/domains/runtime";
import {DomainError} from "@/lib/domains/types";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { getProvider, isLiveAi, type AiResponse } from "@/lib/ai/provider";
import { pickEdit, pickFixture } from "@/lib/ai/stub-fixtures";
import { applyDemoEdit } from "./demo-edits";
import { DESIGN_PROMPTS, getDirection, parseJsonAnswer, validateDoc, type SiteDoc } from "@/lib/design";
import { applyPatch, type EditPatch } from "./patch";
import { describeChanges, validateEditDoc, type EditChange } from "./edit-review";
import { currentAiUsage } from "@/lib/ai/consent";
import { CREATE_OUTPUT, EDIT_OUTPUT, creationSystem, referencedCreationUser, editingSystem, editUser } from "@/lib/ai/operation-plan";
import { getManageStore, getStore, type FactStatus, type Site, type SiteVersion, type Usage } from "@/lib/storage";

// Логика кабинета: создать сайт, поправить, вернуть версию, отметить факт.
// Экраны вызывают только эти функции, сами в хранилище и к AI не ходят.

type DocResult = { doc: SiteDoc; usage: Usage; demo: boolean; reply: string };

const zero = (): Usage => ({ inputTokens: 0, outputTokens: 0, costUsd: 0, estimated: false });
function add(u: Usage, r: AiResponse["usage"]): Usage {
  return { inputTokens: u.inputTokens + r.inputTokens, outputTokens: u.outputTokens + r.outputTokens, costUsd: u.costUsd + r.costUsd, estimated: u.estimated || r.estimated };
}

// Запрос к модели с проверкой и одним повтором с текстом ошибки (правило из CLAUDE.md).
// Строгая проверка: схема, рамки направления, запрет AI-приёмов. Если и после повтора
// остались только «мягкие» замечания по приёмам, принимаем ответ, чтобы не оставить
// владельца без сайта; схема, выбранное направление, читаемость и загруженные
// начертания нового сайта должны пройти всегда.
export async function askForDoc(system: string, user: string, fixtureKey: string, strict: Parameters<typeof validateDoc>[1], creationChecks: boolean, inventory:readonly (string|CreationAsset)[]=[]): Promise<{ doc: SiteDoc; usage: Usage }> {
  const provider = getProvider();
  const checkCharacter = creationChecks && isLiveAi();
  const checkVisual = checkCharacter && system.includes(VISUAL_PLAN_CONTRACT);
  const allowedMedia=inventory.map(asset=>typeof asset==="string"?asset:asset.src);
  const assets=inventory.filter((asset):asset is CreationAsset=>typeof asset!=="string");
  const finishDoc=(doc:SiteDoc)=>checkVisual?fitCreationImages(doc,assets):doc;
  let usage = zero();
  let prompt = user;
  let lastRaw: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await provider.complete({ system, user: prompt, fixtureKey, model:creationModel(), maxTokens: CREATE_OUTPUT });
    usage = add(usage, res.usage);
    let errors: string[];
    try {
      lastRaw = parseJsonAnswer(res.text);
      const check = validateDoc(lastRaw, strict, { antiSlop: checkCharacter });
      errors = check.ok ? [
        ...(checkCharacter ? creationCharacterErrors(check.doc.tokens) : []),
        ...(checkVisual ? creationVisualErrors(check.doc,allowedMedia) : []),
        ...(check.doc.sections.some(s=>["embed.code","free.canvas"].includes(s.composition)) ? ["embed.code and free.canvas are reserved for manual owner editing. Use the normal compositions."] : []),
      ] : check.errors;
      if (check.ok && !errors.length) return { doc: finishDoc(check.doc), usage };
    } catch (e) {
      lastRaw = undefined;
      errors = [`Invalid JSON: ${(e as Error).message}`];
    }
    console.warn(`AI answer attempt ${attempt} rejected:`, errors.slice(0, 8).join(" | "));
    prompt = `${user}\n\nYour previous answer had these problems. Return the complete corrected JSON:\n${errors.join("\n")}`;
  }
  const loose = lastRaw === undefined ? null : validateDoc(lastRaw, strict);
  if (loose?.ok && (!checkCharacter || !creationCharacterErrors(loose.doc.tokens).length) && (!checkVisual || !creationVisualErrors(loose.doc,allowedMedia).length) && !loose.doc.sections.some((s) => ["embed.code","free.canvas"].includes(s.composition))) return { doc: finishDoc(loose.doc), usage };
  throw new Error("The AI answer could not be turned into a site. Please try again.");
}

async function generateDoc(brief: string, locale: string, style?: string, preparedSystem?: string, preparedUser?: string): Promise<DocResult> {
  const system = await readFile(DESIGN_PROMPTS.system, "utf8");
  if (!isLiveAi()) {
    const fixture = pickFixture(brief, style); // демо: готовый сайт из экспериментов
    const { doc, usage } = await askForDoc(system, brief, fixture.key, undefined, false);
    const reply = demoCreationReply(locale, fixture.styleMatched);
    return { doc, usage, demo: true, reply };
  }
  const direction = style ? getDirection(style) : undefined;
  const { doc, usage } = await askForDoc(preparedSystem ?? await creationSystem(locale), preparedUser ?? referencedCreationUser(brief, style), "", direction, true);
  return { doc, usage, demo: false, reply: doc.rationale };
}

async function editDoc(brief: string, current: SiteDoc, request: string, locale: string, preparedSystem?: string): Promise<DocResult | null> {
  if (!isLiveAi()) {
    // Демо: три просьбы выполняет код (demo-edits.ts), остальные ждут модель.
    const edit = pickEdit(request);
    if (!edit) return null;
    const { doc, reply } = applyDemoEdit(current, edit, locale === "ru");
    return { doc, usage: zero(), demo: true, reply: locale === "es" ? "Cambio preparado. Revisa las diferencias antes de aplicarlo." : reply };
  }
  // Правка списком изменений: модель присылает только то, что меняется (в 5-10 раз короче ответа).
  const system = preparedSystem ?? await editingSystem(locale);
  const base = editUser(brief,current,request);
  const provider = getProvider();
  let usage = zero();
  let prompt = base;
  let lastDoc: unknown;
  let reply = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await provider.complete({ system, user: prompt, fixtureKey: "", model:editingModel(), maxTokens: EDIT_OUTPUT, jsonObject: true });
    usage = add(usage, res.usage);
    let errors: string[];
    try {
      const patch = parseJsonAnswer(res.text) as EditPatch;
      reply = typeof patch.reply === "string" ? patch.reply : "";
      const applied = applyPatch(current, patch);
      lastDoc = applied.doc;
      const check = applied.errors.length ? { ok: false as const, errors: applied.errors } : validateEditDoc(applied.doc, current);
      if (check.ok) return { doc: check.doc, usage, demo: false, reply };
      errors = check.errors;
    } catch (e) {
      errors = [`Invalid JSON: ${(e as Error).message}`];
    }
    console.warn(`AI edit attempt ${attempt} rejected:`, errors.slice(0, 8).join(" | "));
    prompt = `${base}\n\nYour previous answer had these problems. Return a corrected patch:\n${errors.join("\n")}`;
  }
  const loose = lastDoc === undefined ? null : validateEditDoc(lastDoc, current);
  if (loose?.ok) return { doc: loose.doc, usage, demo: false, reply };
  throw new Error("The AI edit could not be applied.");
}

function factsFrom(doc: SiteDoc, old: Record<string, FactStatus> = {}): Record<string, FactStatus> {
  // Сохраняем решения владельца по фактам, которые остались в новой версии.
  return Object.fromEntries(doc.factsToConfirm.map((f) => [f.fact, old[f.fact] ?? "unconfirmed"]));
}

export async function createSite(brief: string, direction?: string, preparedSystem?: string, preparedUser?: string): Promise<Site> {
  const store = await getStore();
  const { locale } = await getDict();
  const gen = await generateDoc(brief, locale, direction, preparedSystem, preparedUser);
  const now = new Date().toISOString();
  const site: Site = {
    id: randomUUID().slice(0, 8),
    name: gen.doc.meta.businessName,
    createdAt: now,
    updatedAt: now,
    currentVersion: 1,
    versionCount: 1,
    brief,
    facts: factsFrom(gen.doc),
  };
  const version: SiteVersion = { n: 1, createdAt: now, action: "create", request: brief, reply: gen.reply, doc: gen.doc, usage: gen.usage, demo: gen.demo, aiUsage:currentAiUsage() };
  await store.saveSite(site);
  await store.addVersion(site.id, version);
  return site;
}

export type EditOutcome = { ok: true; id: string; baseVersion: number; changes: EditChange[]; reply: string } | { ok: false; reason: "unsupported" };

export async function editSite(siteId: string, request: string, prepared?: {system: string; version: number}): Promise<EditOutcome> {
  const store = await getManageStore();
  const site = await requireSite(siteId);
  const current = await store.getVersion(siteId, site.currentVersion);
  if (!current) throw new Error("Current version is missing");
  if (prepared && (prepared.version !== site.currentVersion || await store.getPendingEdit(siteId))) throw new Error("Site changed before AI request");
  const res = await editDoc(site.brief, current.doc, request, (await getDict()).locale, prepared?.system);
  if (!res) return { ok: false, reason: "unsupported" };
  // До просмотра не меняются ни текущая версия, ни опубликованный сайт.
  const id = randomUUID();
  await store.savePendingEdit(siteId, { id, baseVersion: site.currentVersion, version: { action: "edit", request, reply: res.reply, doc: res.doc, usage: res.usage, demo: res.demo, aiUsage:currentAiUsage() } });
  return { ok: true, id, baseVersion: site.currentVersion, changes: describeChanges(current.doc, res.doc), reply: res.reply };
}

export async function reviewEdit(siteId: string, id: string, apply: boolean): Promise<void> {
  const store = await getManageStore();
  const pending = await store.getPendingEdit(siteId);
  if (!pending || pending.id !== id) throw new Error("Edit preview is no longer available");
  if (apply) {
    const site = await requireSite(siteId);
    if (site.currentVersion !== pending.baseVersion) throw new Error("Site changed since this preview");
    await pushVersion(site, pending.version);
  }
  await store.deletePendingEdit(siteId);
}

// Возврат не удаляет историю: копия старой версии становится новой версией.
export async function revertTo(siteId: string, n: number): Promise<void> {
  const site = await requireSite(siteId);
  const old = await (await getManageStore()).getVersion(siteId, n);
  if (!old) throw new Error(`Version ${n} not found`);
  const zero: Usage = { inputTokens: 0, outputTokens: 0, costUsd: 0, estimated: false };
  await pushVersion(site, { action: "revert", request: String(n), reply: "", doc: old.doc, usage: zero, demo: false });
}

export async function setFactStatus(siteId: string, fact: string, status: FactStatus): Promise<void> {
  await setFactStatuses(siteId, [fact], status);
}

export async function setFactStatuses(siteId: string, facts: string[], status: FactStatus): Promise<void> {
  const site = await requireSite(siteId, false);
  const updates = Object.fromEntries(facts.filter((fact) => Object.hasOwn(site.facts, fact)).map((fact) => [fact, status]));
  if (!Object.keys(updates).length) return;
  // Одна запись для группы: повторённые/посторонние ключи не создают цикл файловых операций.
  await (await getStore()).saveSite({ ...site, facts: { ...site.facts, ...updates }, updatedAt: new Date().toISOString() });
}

export async function renameSite(siteId: string, name: string): Promise<void> {
  const clean = name.trim().slice(0, 80);
  if (!clean) return;
  const site = await requireSite(siteId);
  await (await getManageStore()).saveSite({ ...site, name: clean, updatedAt: new Date().toISOString() });
}

export async function setStarred(siteId: string, starred: boolean): Promise<void> {
  const site = await requireSite(siteId);
  // updatedAt не трогаем: звёздочка не правка сайта.
  await (await getManageStore()).saveSite({ ...site, starred });
}

// Копия сайта (у Lovable это Remix): новая история из одной версии, текущий вид и статусы фактов сохраняются.
export async function duplicateSite(siteId: string, suffix: string): Promise<Site> {
  const site = await requireSite(siteId);
  const current = await (await getManageStore()).getVersion(siteId, site.currentVersion);
  if (!current) throw new Error(`Version ${site.currentVersion} of ${siteId} not found`);
  const now = new Date().toISOString();
  const copy: Site = {
    ...site,
    id: randomUUID().slice(0, 8),
    name: `${site.name} ${suffix}`.slice(0, 80),
    createdAt: now,
    updatedAt: now,
    currentVersion: 1,
    versionCount: 1,
    starred: false,
    published: undefined, // копия не опубликована, у неё будет свой адрес
    enquiryRecipient: undefined, // для копии получатель подтверждается заново, заявки не копируются
    enquiryNotifications: undefined,
  };
  const doc = await duplicateImages(current.doc, siteId, copy.id);
  await (await getManageStore()).saveSite(copy);
  await (await getManageStore()).addVersion(copy.id, { ...current, doc, n: 1, createdAt: now, action: "create", request: site.brief, aiUsage:undefined });
  return copy;
}

export async function deleteSite(siteId: string): Promise<void> {
  await requireSite(siteId);
  const connection=(await domainService(()=>requireSite(siteId)).state()).connection;
  if(connection&&connection.status!=="disconnected")throw new DomainError("exists");
  await (await getManageStore()).deleteSite(siteId);
}

async function pushVersion(site: Site, v: Omit<SiteVersion, "n" | "createdAt">) {
  const n = site.versionCount + 1;
  const now = new Date().toISOString();
  await (await getManageStore()).addVersion(site.id, { ...v, n, createdAt: now });
  await (await getManageStore()).saveSite({ ...site, currentVersion: n, versionCount: n, updatedAt: now, facts: factsFrom(v.doc, site.facts) });
}

async function requireSite(id: string, manage = true): Promise<Site> {
  const store = await (manage ? getManageStore() : getStore());
  const site = await store.getSite(id);
  if (!site) throw new Error(`Site ${id} not found`);
  return site;
}
