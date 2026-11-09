import { createHash, randomUUID } from "node:crypto";
import type { Site, SiteVersion } from "@/lib/storage/types";
import { isEnquiryForm } from "@/lib/enquiries/forms";
import type { BrowserScan, Finding, WorksReport } from "./types";

export function worksFingerprint(site: Site, version: SiteVersion) {
  return createHash("sha256").update(JSON.stringify([version.n,version.doc,site.facts,site.enquiryRecipient,site.published])).digest("hex");
}
export function analyseWorks(site: Site, version: SiteVersion, html: string, scans: BrowserScan[], locale: string): WorksReport {
  const findings: Finding[] = [];
  const add = (code: Finding["code"], evidence: string, section?: number, priority: Finding["priority"] = "medium", action: Finding["action"] = "review", source: Finding["source"] = "document", confidence: Finding["confidence"] = "measured") => {
    const item: Finding = {code,evidence:evidence.slice(0,400),...(section !== undefined && section >= 0 && section < version.doc.sections.length ? {section} : {}),priority,action,source,confidence};
    if (!findings.some(f=>f.code===code && f.section===item.section && f.evidence===item.evidence)) findings.push(item);
  };
  let phone = false, email = false;
  const forms = version.doc.sections.filter(s=>isEnquiryForm(s.composition)).length;
  version.doc.sections.forEach((s,section)=>{
    if (s.composition === "embed.code") return;
    const walk = (value: unknown, key = "") => {
      if (typeof value === "string") {
        if (value.trim() && (key === "phone" || value.toLowerCase().startsWith("tel:"))) phone = true;
        if (value.trim() && (key === "email" || value.toLowerCase().startsWith("mailto:"))) email = true;
      } else if (value && typeof value === "object") {
        if ("subject" in value && typeof value.subject === "string" && Object.keys(value).length === 1) add("photo",String(value.subject),section,"medium","owner");
        for (const [k,v] of Object.entries(value)) walk(v,k);
      }
    };
    walk(s.props);
  });
  if (forms && !site.enquiryRecipient?.confirmedAt) add("recipient","",version.doc.sections.findIndex(s=>isEnquiryForm(s.composition)),"high","owner");
  for (const fact of version.doc.factsToConfirm) {
    const status = site.facts[fact.fact];
    if (status !== "confirmed") add(status === "wrong" ? "wrong" : "unconfirmed",`${fact.fact} (${fact.where})`,undefined,status === "wrong" ? "high" : "medium","owner");
  }
  const htmlBytes = Buffer.byteLength(html);
  if (htmlBytes > 200 * 1024) add("weight",`${htmlBytes} bytes HTML`,undefined,"medium","specialist","document","possible");
  if (scans.length) { phone = false; email = false; }
  for (const first of scans) {
    phone ||= first.links.some(l=>l.href.toLowerCase().startsWith("tel:"));
    email ||= first.links.some(l=>l.href.toLowerCase().startsWith("mailto:"));
    const normalized = (s: string) => s.trim().toLocaleLowerCase().replace(/\s+/g," ");
    const seen = new Set<string>();
    for (const heading of first.headings) {
      if (!heading.text) add("emptyHeading","<heading>",heading.section,"medium","review","browser");
      else if (seen.has(normalized(heading.text))) add("duplicateHeading",heading.text,heading.section,"low","review","browser","possible");
      seen.add(normalized(heading.text));
    }
    first.duplicateIds.forEach(id=>add("duplicateId",id,undefined,"high","review","browser"));
    first.missingAlt.forEach(section=>add("alt","<img> without alt",section,"medium","review","browser"));
    for (const link of first.links) {
      const href = link.href.trim();
      let internalMissing = false;
      if (href && !/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith("#") && !href.startsWith("//")) {
        try { internalMissing = new URL(href,"https://check.invalid/").pathname !== "/"; } catch { internalMissing = true; }
      }
      if (!href || href.startsWith("#") && !link.targetExists || internalMissing) add("brokenLink",`${link.label}: ${href}`,link.section,"high","review","browser");
      else if (!/^(?:https?:|mailto:|tel:|#|\/|\?)/i.test(href)) add("unsafeLink",`${link.label}: ${href}`,link.section,"high","review","browser");
      if (/^mailto:/i.test(href)) {
        let address = "";
        try { address = decodeURIComponent(href.slice(7).split("?")[0]); } catch {}
        const reserved = /\.(?:example|test|invalid)(?:,|$)|@example\.(?:com|org|net)(?:,|$)/i.test(address);
        if (!address.split(",").every(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) || reserved) add("invalidContact",href,link.section,"high","owner","browser",reserved ? "measured" : "possible");
      }
      if (href.startsWith("tel:") && (!/^tel:\+?[\d\s().-]+$/.test(href) || (href.match(/\d/g)?.length ?? 0)<7)) add("invalidContact",href,link.section,"high","owner","browser","possible");
    }
  }
  if (!phone) add("missingPhone","tel:",undefined,"medium","owner",scans.length ? "browser" : "document");
  if (!email) add("missingEmail","mailto:",undefined,"medium","owner",scans.length ? "browser" : "document");
  for (const scan of scans) {
    scan.overflow.forEach(section=>add("overflow",`${scan.width}px`,section,"high","review","browser",scan.fontsReady ? "measured" : "possible"));
    scan.smallTargets.forEach(section=>add("target",`${scan.width}px, <24 CSS px`,section,"low","review","browser","possible"));
    scan.contrasts.forEach(c=>add("contrast",`${scan.width}px: ${c.ratio.toFixed(2)}:1 < ${c.min}:1, ${c.text}`,c.section,"medium","review","browser"));
  }
  const rank = {high:0,medium:1,low:2};findings.sort((a,b)=>rank[a.priority]-rank[b.priority]);
  return {id:randomUUID(),at:new Date().toISOString(),version:version.n,fingerprint:worksFingerprint(site,version),locale,findings:findings.slice(0,100),htmlBytes,browser:scans.length===2,fontsReady:scans.length===2 && scans.every(s=>s.fontsReady),externalLinks:new Set(scans.flatMap(scan=>scan.links.filter(l=>/^(?:https?:|\/\/)/i.test(l.href)).map(l=>l.href))).size,customCode:version.doc.sections.filter(s=>s.composition==="embed.code").length,forms,limited:findings.length>100 || scans.some(s=>s.truncated)};
}
