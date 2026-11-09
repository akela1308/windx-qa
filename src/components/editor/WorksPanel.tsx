"use client";
import { useDateFormatter } from "@/lib/i18n/use-date-formatter";
import { checkActionsCopy } from "@/lib/checks/actions-copy";
import { manualFindingSection } from "@/lib/checks/manual-target";
import { useState } from "react";
import { startWorksAction, finishWorksAction } from "@/app/works-actions";
import { measureHtml } from "@/lib/checks/browser";
import { findingCopy, worksCopy } from "@/lib/checks/copy";
import type { BrowserScan, Finding, WorksReport } from "@/lib/checks/types";
import type { EditorData } from "./Editor";

export function WorksPanel({data,onFix,onFacts,onCode,onManual}:{data:EditorData;onFix:(text:string,section?:number)=>void;onFacts:()=>void;onCode:()=>void;onManual:(section?:number)=>void}) {
  const t=worksCopy(data.locale),a=checkActionsCopy(data.locale);
  const [local,setLocal]=useState<WorksReport[]>([]),[chosen,setChosen]=useState<string>(),[phase,setPhase]=useState(""),[error,setError]=useState("");
  const reports=[...local,...data.works.reports].filter((r,i,all)=>all.findIndex(x=>x.id===r.id)===i).slice(0,10);
  const report=reports.find(r=>r.id===chosen)??reports[0];
  const stale=!!report && report.fingerprint!==data.works.fingerprint;
  const disabled=!!phase || !!(data.guest&&data.published);
  async function run() {
    setError("");setPhase(t.working);
    try {
      const start=await startWorksAction(data.siteId);if(!start.ok)throw Error();
      let scans:BrowserScan[]=[];
      try { scans=[await measureHtml(start.html,1200),await measureHtml(start.html,390)]; } catch { /* Сохраняем честный неполный отчёт, а не зелёный результат. */ }
      setPhase(t.saving);
      const result=await finishWorksAction(data.siteId,start.fingerprint,scans);
      if(!result.ok)throw Error(result.limited?t.rate:"");
      setLocal(old=>[result.report,...old]);setChosen(result.report.id);
    } catch(e) {setError(e instanceof Error && e.message===t.rate?t.rate:t.failed);} finally {setPhase("");}
  }
  const date=useDateFormatter(data.locale,{dateStyle:"medium",timeStyle:"short"});
  const time=(at:string)=>date.format(new Date(at));
  const fix=(finding:Finding)=>{const [title,,proposal]=findingCopy(data.locale,finding.code);onFix(`${a.context} ${report?.version}.\n${t.ask}\n${title}. ${finding.evidence}\n${proposal}`,finding.section);};
  return <div className="p-4 text-sm">
    <h2 className="font-display text-xl font-bold">{t.title}</h2><p className="mt-3 leading-relaxed text-muted">{t.intro}</p>
    <details key={report?"result":"before"} open={!report} className="mt-3 leading-relaxed text-muted"><summary className="cursor-pointer">{t.scopeTitle}</summary><p className="mt-2">{t.scope}</p></details>
    <button onClick={run} disabled={disabled} className="mt-4 rounded-full bg-ink px-4 py-2.5 font-medium text-bg disabled:opacity-50">{phase || (report?t.again:t.run)}</button>
    {phase&&<p role="status" className="mt-3">{phase}</p>}
    {error&&<p role="alert" className="mt-3 text-warn">{error}</p>}
    {!report&&<p className="mt-6 text-muted">{t.empty}</p>}
    {reports.length>1&&<details className="mt-5 border-t border-line pt-3"><summary className="cursor-pointer">{t.history}</summary><ul className="mt-2 space-y-2">{reports.map(r=><li key={r.id}><button onClick={()=>setChosen(r.id)} className="text-left underline underline-offset-4">{time(r.at)}, {t.version} {r.version}</button></li>)}</ul></details>}
    {report&&<section className="mt-6 border-t border-line pt-4">
      <p className="font-medium">{t.version} {report.version} · {time(report.at)}</p>
      <p className="mt-1 text-xs text-muted">HTML: {Math.ceil(report.htmlBytes/1024)} KiB</p>
      {stale&&<p role="status" className="mt-3 rounded-xl border border-warn/50 p-3 text-warn">{t.stale}</p>}
      <h3 className="mt-5 font-semibold">{report.findings.length?`${t.tasks}: ${report.findings.length}`:t.noIssues}</h3>
      <ol className="mt-3 divide-y divide-line">{report.findings.map((f,i)=>{const [title,why,proposal]=findingCopy(data.locale,f.code);const manual=manualFindingSection(data.content,f.code,f.section);return <li key={`${report.id}-${i}`} className="py-4">
        <p className="text-xs text-muted">{t[f.priority]} · {t[f.confidence]}</p><h4 className="mt-1 font-semibold">{title}</h4>
        <p className="mt-2 text-xs text-muted">{f.section!==undefined?`${t.section} ${f.section+1}`:t.page} · {t.source}: {t[f.source]}</p>
        {f.evidence&&<p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-bg p-2 text-xs">{t.evidence}: {f.evidence}</p>}
        <p className="mt-3 leading-relaxed"><span className="font-medium">{t.why}: </span>{why}</p><p className="mt-2 leading-relaxed"><span className="font-medium">{t.fix}: </span>{proposal}</p>
        <p className="mt-2 text-xs text-muted">{t[f.action]}</p>
        {!data.guest&&!stale&&(manual!==undefined?<button className="mt-3 underline underline-offset-4" onClick={()=>onManual(manual)}>{a.edit}</button>:f.code==="unconfirmed"||f.code==="wrong"||f.code==="recipient"?<button className="mt-3 underline underline-offset-4" onClick={onFacts}>{t.facts}</button>:f.action!=="specialist"?<button disabled={!!data.pendingEdit} className="mt-3 underline underline-offset-4 disabled:opacity-50" onClick={()=>fix(f)}>{t.discuss}</button>:<details className="mt-3"><summary className="cursor-pointer underline">{a.review}</summary><p className="mt-2">{proposal}</p><p className="mt-2 text-xs text-muted">{t.limits}</p></details>)}
      </li>;})}</ol>
      <div className="mt-5 border-t border-line pt-4 leading-relaxed"><h3 className="font-semibold">{t.limitations}</h3><p className="mt-2 text-muted">{t.limits}</p>
        {!report.browser&&<p className="mt-2 text-warn">{t.noBrowser}</p>}{report.browser&&!report.fontsReady&&<p className="mt-2 text-muted">{t.noFonts}</p>}{report.limited&&<p className="mt-2 text-warn">{t.truncated}</p>}
        {report.forms>0&&<p className="mt-3">{t.manual}</p>}
        {report.customCode>0&&!data.guest&&<button onClick={onCode} className="mt-3 underline underline-offset-4">{t.code}</button>}
        <p className="mt-3 text-muted">{t.reportOnly}</p>
        <p className="mt-3 text-xs"><a href="https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html" target="_blank" rel="noopener noreferrer" className="underline">WCAG 1.4.3</a> · <a href="https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html" target="_blank" rel="noopener noreferrer" className="underline">WCAG 2.5.8</a></p>
      </div>
    </section>}
  </div>;
}
