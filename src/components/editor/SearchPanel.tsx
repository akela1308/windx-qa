"use client";
import { useDateFormatter } from "@/lib/i18n/use-date-formatter";
import { checkActionsCopy } from "@/lib/checks/actions-copy";
import { manualFindingSection } from "@/lib/checks/manual-target";
import { useState } from "react";
import { startSearchAction,finishSearchAction } from "@/app/search-actions";
import { measureSearchHtml } from "@/lib/search/browser";
import { searchCopy,searchFindingCopy,searchPart } from "@/lib/search/copy";
import type { SearchSnapshot,SearchReport,SearchFinding } from "@/lib/search/types";
import type { EditorData } from "./Editor";

export function SearchPanel({data,onFix,onFacts,onManual}:{data:EditorData;onFix:(text:string,section?:number)=>void;onFacts:()=>void;onManual:(section?:number)=>void}){
 const t=searchCopy(data.locale),a=checkActionsCopy(data.locale);
 const [target,setTarget]=useState<"draft"|"published">(data.published?"published":"draft"),[local,setLocal]=useState<SearchReport[]>([]),[chosen,setChosen]=useState<string>(),[phase,setPhase]=useState(""),[error,setError]=useState("");
 const reports=[...local,...data.search.reports].filter((r,i,all)=>all.findIndex(v=>v.id===r.id)===i).slice(0,10);
 const report=reports.find(r=>r.id===chosen)??reports.find(r=>r.target===target);
 const fingerprint=report?.target==="published"?data.search.published:data.search.draft,stale=!!report&&report.fingerprint!==fingerprint;
 async function run(){setError("");setPhase(t.working);try{
   const start=await startSearchAction(data.siteId,target);if(!start.ok)throw Error(start.limited?t.rate:"");
   let snapshot:SearchSnapshot|null=null;try{snapshot=await measureSearchHtml(start.html,start.evidence.sitemap.status===200?start.evidence.sitemap.body:"");}catch{}
   setPhase(t.saving);const result=await finishSearchAction(data.siteId,start.evidence,start.signature,snapshot);if(!result.ok)throw Error(result.limited?t.rate:result.stale?t.stale:"");
   setLocal(old=>[result.report,...old.filter(r=>r.id!==result.report.id)]);setChosen(result.report.id);
 }catch(e){setError(e instanceof Error&&[t.rate,t.stale].includes(e.message)?e.message:t.failed);}finally{setPhase("");}}
 const date=useDateFormatter(data.locale,{dateStyle:"medium",timeStyle:"short"});
  const time=(at:string)=>date.format(new Date(at));
 const fix=(f:SearchFinding)=>{const [title,,next]=searchFindingCopy(data.locale,f.code);onFix(`${a.context} ${report?.version}.\n${t.ask}\n${title}. ${f.evidence}\n${next}`,f.section);};
 return <div className="p-4 text-sm"><h2 className="font-display text-xl font-bold">{t.title}</h2><p className="mt-3 leading-relaxed text-muted">{t.intro}</p>
   <details key={report?"result":"before"} open={!report} className="mt-3 leading-relaxed text-muted"><summary className="cursor-pointer">{t.scopeTitle}</summary><p className="mt-2">{t.scope}</p></details>
   <div role="group" aria-label={t.version} className="mt-4 flex flex-wrap gap-2">{(["draft","published"] as const).map(value=><button key={value} disabled={!!phase||value==="published"&&!data.published} aria-pressed={target===value} onClick={()=>{setTarget(value);setChosen(undefined);}} className={`rounded-full border border-line px-3 py-2 disabled:opacity-50 ${target===value?"bg-bg font-medium":""}`}>{t[value]}</button>)}</div>
   <button onClick={run} disabled={!!phase||!!(data.guest&&data.published)} className="mt-3 rounded-full bg-ink px-4 py-2.5 font-medium text-bg disabled:opacity-50">{phase||(report?t.again:t.run)}</button>
   {phase&&<p role="status" className="mt-3">{phase}</p>}{error&&<p role="alert" className="mt-3 text-warn">{error}</p>}
   <dl className="mt-5 divide-y divide-line border-y border-line text-xs leading-relaxed"><div className="py-3"><dt className="font-semibold">{t.technical}</dt><dd>{report ? stale ? t.stale : `${!report.browser || report.unavailable ? t.partial + ". " : ""}${t.tasks}: ${report.findings.length}` : t.readiness}</dd></div><div className="py-3"><dt className="font-semibold">{t.indexing}</dt><dd className="text-muted">{t.unknown}</dd></div><div className="py-3"><dt className="font-semibold">{t.traffic}</dt><dd className="text-muted">{t.noData}</dd></div></dl>
   <details className="mt-3 rounded-lg border border-line p-3"><summary className="cursor-pointer font-medium">{a.connect}</summary><p className="mt-2 leading-relaxed">{a.connection}</p><a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block underline">{a.open}</a></details>
   {!report&&<p className="mt-5 text-muted">{t.empty}</p>}
   {reports.length>1&&<details className="mt-4"><summary className="cursor-pointer">{t.history}</summary><ul className="mt-3 space-y-2">{reports.map(r=><li key={r.id}><button className="text-left underline underline-offset-4" onClick={()=>{setTarget(r.target);setChosen(r.id);}}>{time(r.at)}, {t[r.target]}, {t.version} {r.version}</button></li>)}</ul></details>}
   {report&&<section className="mt-5 border-t border-line pt-4"><p className="font-medium">{t[report.target]} · {t.version} {report.version}</p><p className="mt-1 text-xs text-muted">{time(report.at)}</p><p className="mt-2 break-all text-xs">{report.url}</p><p className="mt-2 text-xs text-muted">{t.source}: {t[report.source]}</p>
     {stale&&<p role="status" className="mt-3 rounded-xl border border-warn/50 p-3 text-warn">{t.stale}</p>}{!report.browser&&<p className="mt-3 text-warn">{t.noBrowser}</p>}{report.target==="draft"&&<p className="mt-3 leading-relaxed text-muted">{t.draftNote}</p>}{report.unavailable&&<p className="mt-3 text-warn">{t.fallback}</p>}
     <details className="mt-4 leading-relaxed"><summary className="cursor-pointer">{t.metadata}</summary><p className="mt-3 break-words font-medium">{report.title||"∅"}</p><p className="mt-2 break-words text-muted">{report.description||"∅"}</p><p className="mt-2 text-xs text-muted">{t.snippet}</p><p className="mt-2 break-words text-xs">lang: {report.lang||"∅"}; h1: {report.h1Count<0?"?":report.h1Count}; JSON-LD: {report.types.join(", ")||"∅"}</p></details>
     <details className="mt-3"><summary className="cursor-pointer">{t.checks}: {report.passed.length}</summary><ul className="mt-2 list-inside list-disc text-xs leading-relaxed text-muted">{report.passed.map(code=><li key={code}>{searchPart(data.locale,code)}</li>)}</ul></details>
     {report.target==="published"&&<p className="mt-3 text-xs text-muted">{t.status}: / {report.pageStatus??"?"}, robots.txt {report.robotsStatus??"?"}, sitemap.xml {report.sitemapStatus??"?"}</p>}
     <h3 className="mt-5 font-semibold">{report.findings.length?`${t.tasks}: ${report.findings.length}`:t.none}</h3>
     <ol className="mt-2 divide-y divide-line">{report.findings.map((f,i)=>{const [title,why,next]=searchFindingCopy(data.locale,f.code);const manual=manualFindingSection(data.content,f.code,f.section);return <li key={`${report.id}-${i}`} className="py-4"><p className="text-xs text-muted">{t[f.priority]} · {t[f.confidence]}</p><h4 className="mt-1 font-semibold">{title}</h4><p className="mt-2 text-xs text-muted">{f.section===undefined?t.page:`${t.section} ${f.section+1}`} · {f.source==="http"?t.httpCheck:t[f.source]}</p>
       {f.evidence&&<p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-bg p-2 text-xs">{t.observation}: {f.evidence}</p>}<p className="mt-3 leading-relaxed"><b className="font-medium">{t.why}: </b>{why}</p><p className="mt-2 leading-relaxed"><b className="font-medium">{t.fix}: </b>{next}</p><p className="mt-2 text-xs text-muted">{t[f.action]}</p><a href={f.reference} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs underline underline-offset-4">{t.reference}</a>
       {!data.guest&&!stale&&report.version!==data.currentVersion&&<button className="mt-3 block underline" onClick={()=>{setTarget("draft");setChosen(undefined);}}>{data.locale === "ru" ? "Открыть проверку текущего черновика для правки" : data.locale === "es" ? "Abrir revisión del borrador actual" : "Open current draft check before editing"}</button>}
       {!data.guest&&!stale&&report.version===data.currentVersion&&(manual!==undefined?<button onClick={()=>onManual(manual)} className="mt-3 block underline underline-offset-4">{a.edit}</button>:f.code==="facts"?<button onClick={onFacts} className="mt-3 block underline underline-offset-4">{t.facts}</button>:f.action==="review"||["title","description","phone","phoneFormat","contactMismatch","address","alt"].includes(f.code)?<button disabled={!!data.pendingEdit} onClick={()=>fix(f)} className="mt-3 block underline underline-offset-4 disabled:opacity-50">{t.discuss}</button>:<details className="mt-3"><summary className="cursor-pointer underline">{a.review}</summary><p className="mt-2">{next}</p><p className="mt-2 text-xs text-muted">{t.limits}</p></details>)}
     </li>;})}</ol>
     <div className="mt-5 border-t border-line pt-4 leading-relaxed text-muted"><p>{t.limits}</p>{!report.browser&&<p className="mt-3 text-warn">{t.noBrowser}</p>}{report.limited&&<p className="mt-3 text-warn">{t.limited}</p>}<p className="mt-3">{t.reportsOnly}</p><a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block underline underline-offset-4">{t.richTest}</a></div>
   </section>}
 </div>;
}
