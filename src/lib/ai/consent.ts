import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { authFile, insertJson, readJson, replaceJson } from "@/lib/auth/account-store";
import { allowAttempt } from "@/lib/auth/accounts";
import type { OperationPlan } from "./operation-plan";
import { AiConsentError, type AiEstimate, type AiUsageReceipt } from "./estimate-types";
import type { AiProvider, AiRequest, AiResponse } from "./provider";
import { DEFAULT_MODEL } from "./openrouter";
type Stored = {owner: string; fingerprint: string; estimate: AiEstimate; used?: boolean; receipt?: AiUsageReceipt; status?: "complete" | "failed" | "cancelled"};
type Execution = {plan: OperationPlan; remaining: number[]; receipt: AiUsageReceipt; persist: () => Promise<void>};
const runtime = globalThis as typeof globalThis & {windxAiConsent?: AsyncLocalStorage<Execution>};
const context = runtime.windxAiConsent ??= new AsyncLocalStorage<Execution>();
export function currentAiUsage() { const receipt=context.getStore()?.receipt; return receipt?structuredClone(receipt):undefined; }
const validId = (s: string) => /^[a-f0-9-]{36}$/.test(s);
export async function issueEstimate(owner: string, plan: OperationPlan, now = Date.now()): Promise<AiEstimate> {
  if (!allowAttempt(`ai-estimate:${owner}`,40) || !allowAttempt("ai-estimate:global",500)) throw new AiConsentError();
  const estimate = {...plan.summary, id: randomUUID(), expiresAt: now+15*60_000};
  await insertJson(authFile("ai-estimates",estimate.id), {owner,fingerprint: plan.fingerprint,estimate} satisfies Stored);
  // Ограниченная уборка истёкших служебных оценок, без описаний сайта и заявок.
  const dir = path.dirname(authFile("ai-estimates",estimate.id));
  for (const name of (await readdir(dir)).slice(0,100)) {
    const file = path.join(dir,name);
    try { if ((await stat(file)).mtimeMs < now-48*3600_000) await rm(file,{recursive: true,force: true}); } catch {}
  }
  return estimate;
}
export async function estimateMatches(id: string, owner: string, plan: OperationPlan, now = Date.now()) {
  if (!validId(id)) return false;
  const stored = await readJson<Stored>(authFile("ai-estimates",id));
  return !!stored && !stored.used && stored.owner===owner && stored.fingerprint===plan.fingerprint && stored.estimate.expiresAt>now;
}
export async function readReceipt(id: string, owner: string) {
  if (!validId(id)) return undefined;
  const stored = await readJson<Stored>(authFile("ai-estimates",id));
  return stored?.owner===owner ? stored.receipt : undefined;
}
export async function cancelEstimate(id: string, owner: string) {
  if (!validId(id)) return;
  const file=authFile("ai-estimates",id), stored=await readJson<Stored>(file);
  if (!stored || stored.owner!==owner || stored.used) return;
  try { await mkdir(`${file}.used`,{mode:0o700}); } catch { return; }
  stored.used=true;stored.status="cancelled";await replaceJson(file,stored);
}
export async function withAiConsent<T>(id: string, owner: string, plan: OperationPlan, operation: () => Promise<T>): Promise<{result: T; receipt: AiUsageReceipt}> {
  if (!await estimateMatches(id,owner,plan)) throw new AiConsentError();
  const file = authFile("ai-estimates",id);
  try { await mkdir(`${file}.used`,{mode: 0o700}); } catch { throw new AiConsentError(); }
  // Одноразовый claim остаётся после сбоя/рестарта: оплачиваемое действие не повторяется молча.
  const stored = JSON.parse(await readFile(file,"utf8")) as Stored;
  if (stored.used || stored.estimate.expiresAt<=Date.now()) throw new AiConsentError();
  const receipt: AiUsageReceipt = {requests:0,inputTokens:0,outputTokens:0,estimated:false,unknownRequests:0,demo:plan.summary.demo};
  stored.used=true; stored.receipt=receipt;
  const persist = () => replaceJson(file,stored);
  await persist();
  return context.run({plan,remaining:plan.steps.map(s=>s.count),receipt,persist},async()=>{
    try { const result=await operation(); stored.status="complete"; await persist(); return {result,receipt}; }
    catch(e) { stored.status="failed"; await persist(); throw e; }
  });
}
export function consentProvider(provider: AiProvider, model = process.env.AI_MODEL ?? DEFAULT_MODEL): AiProvider {
  return {async complete(req: AiRequest): Promise<AiResponse> {
    const run=context.getStore();
    if (!run) throw new AiConsentError();
    const actualModel=req.model??model, output=req.maxTokens??16000, bytes=Buffer.byteLength(req.system+req.user)+1024;
    const i=run.plan.steps.findIndex((s,i)=>s.model===actualModel && s.maxOutput>=output && s.inputBytes>=bytes && run.remaining[i]>0);
    if (i<0) throw new AiConsentError();
    run.remaining[i]--;
    run.receipt.requests++; run.receipt.unknownRequests++;
    await run.persist();
    try {
      const response=await provider.complete(req);
      run.receipt.unknownRequests--;run.receipt.inputTokens+=response.usage.inputTokens;run.receipt.outputTokens+=response.usage.outputTokens;run.receipt.estimated ||= response.usage.estimated;
      await run.persist();return response;
    } catch(e) { await run.persist(); throw e; }
  }};
}
