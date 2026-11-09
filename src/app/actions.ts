"use server";
import { actionMessages } from "@/lib/i18n/action-messages";

import {DomainError} from "@/lib/domains/types";
import {domainCopy} from "@/lib/domains/copy";
import { cookies, headers } from "next/headers";
import { isIP } from "node:net";
import { ensureIdentity, currentUser, currentIdentity } from "@/lib/auth/session";
import { getManageStore } from "@/lib/storage";
import { cancelEstimate, issueEstimate, estimateMatches, readReceipt, withAiConsent } from "@/lib/ai/consent";
import { planCreation, planEdit } from "@/lib/ai/operation-plan";
import { AiConsentError, type AiEstimate, type AiUsageReceipt } from "@/lib/ai/estimate-types";
import { aiEstimateCopy } from "@/lib/ai/estimate-copy";
import { reserveTrial, releaseTrial, TrialLimit } from "@/lib/auth/guest";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getDict, isLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { isLiveAi } from "@/lib/ai/provider";
import { needsClarification } from "@/lib/sites/clarify";
import { createSite, deleteSite, duplicateSite, editSite, renameSite, reviewEdit, revertTo, setFactStatus, setFactStatuses, setStarred } from "@/lib/sites/service";
import { publishSite, unpublishSite, type PublishBlock } from "@/lib/sites/publish";
import type { FactStatus } from "@/lib/storage";
import type { EditChange } from "@/lib/sites/edit-review";

// Действия кабинета, которые вызываются кнопками и формами.
// Проверка сессии и владельца централизована в getStore / OwnedSiteStore.

export async function setLanguage(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  refresh();
}

export type CreateState = { clarify: boolean; brief: string; error?: boolean; message?: string; needsAccount?: boolean; estimate?: AiEstimate; receipt?: AiUsageReceipt };

export async function createSiteAction(prev: CreateState, form: FormData): Promise<CreateState> {
  const {locale} = await getDict(), c=aiEstimateCopy(locale);
  const messages = actionMessages(locale);
  const brief = String(form.get("brief") ?? "").trim();
  const answer = String(form.get("answer") ?? "").trim();
  // Стиль необязателен: если не выбран, подбираем по типу бизнеса.
  const style = String(form.get("style") ?? "").trim() || undefined;
  const full = answer ? `${brief}\n\n${answer}` : brief;
  if (form.get("decision")==="cancel") { const identity=await currentIdentity();if(identity)await cancelEstimate(String(form.get("estimateId")??""),identity.id);return {clarify:false,brief:full}; }
  if (!full) return { clarify: false, brief };
  if (full.length>20_000) return {clarify:false,brief:full,error:true,message:c.tooLong};
  // Один уточняющий вопрос, и только если без ответа сайт не сделать.
  if (!prev.clarify && needsClarification(full)) return { clarify: true, brief };
  const started = Date.now();
  let siteId: string;
  let reservation: Awaited<ReturnType<typeof reserveTrial>> = null;
  let owner = ""; let estimateId=String(form.get("estimateId")??"");
  try {
    const identity=await ensureIdentity(); owner=identity.id;
    const plan=await planCreation(full,style,locale,String(form.get("template")??""));
    // Server-owned price policy; never trust a hidden field to declare an action free.
    if (plan.summary.customerCharge === "none" && form.get("decision") !== "confirm") {
      estimateId = (await issueEstimate(owner,plan)).id;
    } else if (form.get("decision")!=="confirm" || !await estimateMatches(estimateId,owner,plan)) {
      const stale=form.get("decision")==="confirm";
      return {clarify:false,brief:full,estimate:await issueEstimate(owner,plan),message:stale?c.stale:undefined};
    }
    await ensureIdentity(async (identity) => {
      // Railway public ingress задаёт X-Real-IP. IP только ограничивает попытки,
      // никогда не определяет владельца. При отсутствии IP используем общий лимит.
      const ip = (await headers()).get("x-real-ip") ?? "";
      reservation = await reserveTrial(identity, process.env.NODE_ENV !== "production" ? "local-development" : isIP(ip) ? ip : "unavailable");
    });
    siteId = (await withAiConsent(estimateId,owner,plan,()=>createSite(full,style,plan.system,plan.user))).result.id;
  } catch (e) {
    await releaseTrial(reservation);
    if (e instanceof TrialLimit) {
      return { clarify: false, brief: full, error: true, needsAccount: true, message: e.reason === "browser" ? messages.trialBrowser : messages.trialDay };
    }
    // Модель не ответила или ответ не прошёл проверку: текст владельца сохраняем, показываем сообщение.
    console.error("createSite failed");
    return { clarify: false, brief: full, error: true, message: e instanceof AiConsentError ? c.stale : messages.createFailed, receipt:owner?await readReceipt(estimateId,owner):undefined };
  }
  // Демо: заглушка отвечает мгновенно, а экран сборки должен успеть показать шаги.
  if (!isLiveAi()) await new Promise((r) => setTimeout(r, Math.max(0, 2600 - (Date.now() - started))));
  redirect(`/sites/${siteId}`);
}

export type EditState = ({ status: "idle" | "ok" } | { status: "error" | "unsupported"; message?: string; field?: string } | {status:"estimate";estimate:AiEstimate;asked:string;section?:number;composition?:string;message?:string} | { status: "review"; id: string; baseVersion: number; changes: EditChange[]; reply: string }) & {receipt?: AiUsageReceipt};

export async function editSiteAction(siteId: string, _prev: EditState, form: FormData): Promise<EditState> {
  const {locale}=await getDict(), c=aiEstimateCopy(locale), messages = actionMessages(locale);
  const decision = form.get("decision");
  if (decision==="cancel") {const user=await currentUser();if(user)await cancelEstimate(String(form.get("estimateId")??""),user.id);return {status:"idle"};}
  if (decision === "apply" || decision === "discard") {
    try {
      await reviewEdit(siteId, String(form.get("editId") ?? ""), decision === "apply");
      refresh();
      return { status: decision === "apply" ? "ok" : "idle" };
    } catch {
      return { status: "error", message: messages.editFailed };
    }
  }
  // Подсказка имеет отдельное имя: оставшийся в поле текст не подменяет выбранное действие.
  const asked = String(form.get("suggestion")??"").trim() || (form.getAll("request").map((x) => String(x).trim()).filter(Boolean).pop() ?? "");
  if (!asked) return { status: "idle" };
  if (asked.length>8000) return {status:"error",message:c.tooLong};
  // Блок, выбранный кликом на превью: номер раздела (с нуля, как в describeForEdit) и его композиция.
  const section = Number(form.get("section"));
  const composition = String(form.get("composition") ?? "").replace(/[^\w.-]/g, "");
  const request = Number.isInteger(section) && section >= 0 && form.get("section") !== null
    ? `Only change section ${section} (${composition}). ${asked}`
    : asked;
  let owner=""; const estimateId=String(form.get("estimateId")??"");
  try {
    const user=await currentUser();if(!user)throw new Error("Sign in required");owner=user.id;
    const store=await getManageStore(), site=await store.getSite(siteId);
    if(!site || await store.getPendingEdit(siteId))throw new Error("Site unavailable or proposal pending");
    const version=await store.getVersion(siteId,site.currentVersion);if(!version)throw new Error("Missing version");
    const plan=await planEdit(site.brief,version.doc,request,locale,site.currentVersion,siteId);
    if(decision!=="confirm" || !await estimateMatches(estimateId,owner,plan)) return {status:"estimate",estimate:await issueEstimate(owner,plan),asked,section:form.get("section")!==null?section:undefined,composition,message:decision==="confirm"?c.stale:undefined};
    const {result:res,receipt}=await withAiConsent(estimateId,owner,plan,()=>editSite(siteId,request,{system:plan.system,version:site.currentVersion}));
    refresh();
    return res.ok ? { status: "review", id: res.id, baseVersion: res.baseVersion, changes: res.changes, reply: res.reply,receipt } : { status: "unsupported", message: messages.unsupported,receipt };
  } catch (e) {
    console.error("editSite failed");
    return { status: "error", message:e instanceof AiConsentError?c.stale:messages.editFailed,receipt:owner?await readReceipt(estimateId,owner):undefined };
  }
}

export async function revertAction(siteId: string, n: number) {
  await revertTo(siteId, n);
  refresh();
}

export async function factAction(siteId: string, fact: string, status: FactStatus) {
  if (!["unconfirmed", "confirmed", "wrong"].includes(status)) return;
  await setFactStatus(siteId, fact, status);
  refresh();
}

export async function renameAction(siteId: string, name: string) {
  await renameSite(siteId, name);
  refresh();
}

export async function deleteAction(siteId: string) {
  try {await deleteSite(siteId);refresh();return {ok:true as const};}
  catch(error){const {locale,t}=await getDict();return {ok:false as const,message:error instanceof DomainError&&error.code==="exists"?domainCopy(locale).deleteFirst:t.editor.failed};}
}

// Несколько фактов разом: «всё в этом разделе верно».
export async function factsBulkAction(siteId: string, facts: string[], status: FactStatus) {
  if (!["unconfirmed", "confirmed", "wrong"].includes(status)) return;
  await setFactStatuses(siteId, facts, status);
  refresh();
}

export async function starAction(siteId: string, starred: boolean) {
  await setStarred(siteId, starred);
  refresh();
}

// Копия сайта; возвращает id копии, чтобы интерфейс мог сразу её открыть.
export async function duplicateAction(siteId: string): Promise<string> {
  const { t } = await getDict();
  const copy = await duplicateSite(siteId, t.tools.copySuffix);
  refresh();
  return copy.id;
}

export type PublishState = { status: "idle" } | { status: "live"; url: string } | { status: "blocked"; block: PublishBlock } | { status: "error" };

// Публикация текущей версии. Не пройдёт, пока придуманные AI факты не подтверждены.
export async function publishAction(siteId: string): Promise<PublishState> {
  try {
    const res = await publishSite(siteId);
    refresh();
    return res.ok ? { status: "live", url: res.url } : { status: "blocked", block: res.block };
  } catch (e) {
    console.error("publishSite failed:", e);
    return { status: "error" };
  }
}

export async function unpublishAction(siteId: string) {
  await unpublishSite(siteId);
  refresh();
}
