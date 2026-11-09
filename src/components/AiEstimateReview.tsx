"use client";
import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { aiEstimateCopy } from "@/lib/ai/estimate-copy";
import type { AiEstimate, AiUsageReceipt } from "@/lib/ai/estimate-types";
export function AiEstimateReview({estimate,locale,pending,message,onCancel,onConfirm}:{estimate:AiEstimate;locale:string;pending:boolean;message?:string;onCancel?:()=>void;onConfirm?:()=>void}) {
  const c=aiEstimateCopy(locale), f=new Intl.NumberFormat(locale);
  const submission=useFormStatus();
  const busy=pending||submission.pending;
  const cancelling=submission.data?.get("decision")==="cancel";
  const ref=useRef<HTMLElement>(null);
  useEffect(()=>{ref.current?.focus({preventScroll:true});},[estimate.id]);
  return <section ref={ref} tabIndex={-1} aria-label={estimate.action === "create" ? c.createTitle : c.editTitle} aria-busy={busy} className="mt-3 rounded-xl border border-ink bg-bg p-4 text-sm outline-none">
    <h3 className="font-medium">{estimate.action === "create" ? c.createTitle : c.editTitle}</h3><p role={busy?"status":undefined} className="mt-2 leading-relaxed">{busy?cancelling?c.cancelling:estimate.demo?c.demo:c.running:c.intro}</p>
    {message&&<p role="alert" className="mt-2 text-warn">{message}</p>}
    {estimate.demo?<p className="mt-3 font-medium">{c.demo}</p>:<><p className="mt-3 font-medium">{c.trial}</p><details className="mt-3"><summary className="cursor-pointer text-muted underline">{c.technical}</summary><dl className="mt-3 space-y-2"><div><dt className="text-muted">{c.input}</dt><dd>{f.format(estimate.inputLow)}–{f.format(estimate.inputHigh)} {c.tokens}</dd></div><div><dt className="text-muted">{c.output}</dt><dd>{f.format(estimate.outputMax)} {c.tokens}</dd></div><div><dt className="text-muted">{c.calls}</dt><dd>{estimate.requestsMax}</dd></div></dl><p className="mt-3">{estimate.includesStyle?c.style:c.retry}</p><p className="mt-3 leading-relaxed text-muted">{c.help}</p></details></>}
    {!busy&&<p className="mt-3 text-muted">{c.expiry}</p>}<input type="hidden" name="estimateId" value={estimate.id}/>
    <div className="mt-4 flex flex-wrap gap-2"><button name="decision" value="confirm" disabled={busy} onClick={onConfirm} className="min-h-11 rounded-full bg-ink px-4 py-2 text-bg disabled:opacity-50">{busy&&!cancelling?c.working:estimate.demo?c.demoConfirm:estimate.action === "create"?c.createConfirm:c.editConfirm}</button><button name="decision" value="cancel" formNoValidate disabled={busy} onClick={onCancel} className="min-h-11 rounded-full border border-line px-4 py-2 disabled:opacity-50">{c.cancel}</button></div>
  </section>;
}
export function AiUsage({receipt,locale}:{receipt:AiUsageReceipt;locale:string}) {
  const c=aiEstimateCopy(locale), n=new Intl.NumberFormat(locale).format(receipt.inputTokens+receipt.outputTokens);
  return <details className="mt-2 text-xs leading-relaxed text-muted"><summary className="cursor-pointer underline">{c.technical}</summary><div role="status" className="mt-2">{receipt.demo?c.demoUsage:receipt.requests===0?c.none:<>{receipt.requests>receipt.unknownRequests&&<span>{receipt.unknownRequests>0?c.partial:c.usage}: {receipt.estimated?`${c.approx} `:""}{n} {c.tokens}.</span>}{receipt.unknownRequests>0&&<p className="mt-1 text-warn">{c.unknown}</p>}</>}</div></details>;
}
