import { createHash } from "node:crypto";
import type { Site,SiteVersion } from "@/lib/storage/types";
import localTypes from "./local-business-types.json";
import { blocksGoogleRoot,hasGoogleNoindex } from "./robots";
import type { SearchEvidence,SearchSnapshot,SearchReport,SearchFinding,SearchCode } from "./types";
export const SEARCH_REFERENCES={
 title:"https://developers.google.com/search/docs/appearance/title-link",description:"https://developers.google.com/search/docs/appearance/snippet",general:"https://developers.google.com/search/docs/fundamentals/seo-starter-guide",robots:"https://developers.google.com/search/docs/crawling-indexing/robots/intro",noindex:"https://developers.google.com/search/docs/crawling-indexing/block-indexing",sitemap:"https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview",local:"https://developers.google.com/search/docs/appearance/structured-data/local-business",canonical:"https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls",
};
export function searchFingerprint(site:Site,version:SiteVersion,target:"draft"|"published",url:string){return createHash("sha256").update(JSON.stringify([target,url,version.n,version.doc,site.facts,site.published])).digest("hex");}
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");export {hash as searchHtmlHash};
export function analyseSearch(site:Site,version:SiteVersion,e:SearchEvidence,s:SearchSnapshot|null):SearchReport {
 const findings:SearchFinding[]=[],passed:string[]=[];
 const add=(code:SearchCode,evidence="",priority:SearchFinding["priority"]="medium",action:SearchFinding["action"]="review",confidence:SearchFinding["confidence"]="measured",section?:number,source:SearchFinding["source"]="html",reference=SEARCH_REFERENCES.general)=>{const f:SearchFinding={code,evidence:evidence.slice(0,400),priority,action,confidence,source,reference,...(section!==undefined&&section>=0&&section<version.doc.sections.length?{section}:{})};if(!findings.some(v=>v.code===code&&v.section===f.section&&v.evidence===f.evidence))findings.push(f);};
 const meta=s??{title:version.doc.meta.title,titleCount:1,description:version.doc.meta.description,descriptionCount:1,lang:"",h1:[],canonicals:[],jsonld:[],text:"",links:[],robots:[],missingAlt:0,limited:false,sitemap:null};
 if(meta.titleCount!==1||!meta.title.trim())add("title",`${meta.titleCount}: ${meta.title}`,"high","review","measured",undefined,s?"html":"document",SEARCH_REFERENCES.title);else passed.push("title");
 if(meta.descriptionCount!==1||!meta.description.trim())add("description",`${meta.descriptionCount}: ${meta.description}`,"medium","review","measured",undefined,s?"html":"document",SEARCH_REFERENCES.description);else passed.push("description");
 if(s){
   if(s.h1.length!==1||!s.h1[0]?.text.trim())add("h1",`h1: ${s.h1.length}`,"medium","review","possible");else passed.push("h1");
   let validLang=false;try{validLang=!!s.lang&&!!new Intl.Locale(s.lang).language;}catch{}
   if(!validLang)add("language",s.lang,"medium","specialist");else passed.push("language");
   const letters=s.text.match(/\p{L}/gu)??[],cyrillic=s.text.match(/[а-яё]/giu)??[];
   if(letters.length>80&&cyrillic.length/letters.length>.6&&/^en(?:-|$)/i.test(s.lang))add("languageMismatch",`${s.lang}; Cyrillic text`,"low","specialist","possible");
   if(s.canonicals.length!==1)add("canonical",String(s.canonicals.length),"low","specialist","possible",undefined,"html",SEARCH_REFERENCES.canonical);
   else {try{const canonical=new URL(s.canonicals[0]);if(canonical.hash||canonical.href!==e.url)add("canonicalConflict",s.canonicals[0],"medium","owner","possible",undefined,"html",SEARCH_REFERENCES.canonical);else passed.push("canonical");}catch{add("canonicalConflict",s.canonicals[0],"medium","specialist","possible",undefined,"html",SEARCH_REFERENCES.canonical);}}
   for(const link of s.links)if(link.href.startsWith("#")&&!link.targetExists)add("brokenLink",link.href,"medium","review","measured",link.section);
   if(s.missingAlt)add("alt",String(s.missingAlt),"medium","review","possible");
 }
 const responseRobots=e.source==="http"?e.page.robots:"";
 if(hasGoogleNoindex(s?.robots??[],responseRobots))add("noindex",[...(s?.robots??[]),responseRobots].join(","),"high","owner","measured",undefined,responseRobots?"http":"html",SEARCH_REFERENCES.noindex);else if(s&&e.source==="http")passed.push("indexDirective");
 let address=false,phone=false;const phones:string[]=[];
 const walk=(v:unknown,key="")=>{if(typeof v==="string"&&v.trim()){if(key==="address")address=true;if(key==="phone"||v.toLowerCase().startsWith("tel:")){phone=true;phones.push(v.replace(/^tel:/i,""));}}else if(v&&typeof v==="object")for(const[k,value]of Object.entries(v))walk(value,k);};
 version.doc.sections.filter(v=>v.composition!=="embed.code").forEach(v=>walk(v.props));
 if(!address)add("address","","low","owner","possible",undefined,"document",SEARCH_REFERENCES.local);else passed.push("address");
 if(!phone)add("phone","","low","owner","possible",undefined,"document",SEARCH_REFERENCES.local);
 else {passed.push("phone");if(phones.some(v=>!/^\+[1-9]\d{6,14}$/.test(v.replace(/[\s().-]/g,""))))add("phoneFormat",phones.join(", "),"low","owner","possible",undefined,"document",SEARCH_REFERENCES.local);}
 const types:string[]=[],businesses:Record<string,unknown>[]=[];let structuredLimited=false;
 const collect=(v:unknown,depth=0,schemaContext=false)=>{if(depth>8){structuredLimited=true;return;}if(Array.isArray(v)){v.slice(0,100).forEach(item=>collect(item,depth+1,schemaContext));if(v.length>100)structuredLimited=true;return;}if(!v||typeof v!=="object")return;const item=v as Record<string,unknown>;
   if("@context" in item){const contexts=Array.isArray(item["@context"])?item["@context"]:[item["@context"]];schemaContext=contexts.some((ctx:unknown)=>typeof ctx==="string"?/^https?:\/\/schema\.org\/?$/.test(ctx):!!ctx&&typeof ctx==="object"&&"@vocab" in ctx&&/^https?:\/\/schema\.org\/?$/.test(String(ctx["@vocab"])));}
   const ts=(Array.isArray(item['@type'])?item['@type']:[item['@type']]).filter((v):v is string=>typeof v==="string").map(v=>v.replace(/^https?:\/\/(?:www\.)?schema\.org\//,""));
   types.push(...ts.map(type=>type.slice(0,100)));if(schemaContext&&ts.some(t=>localTypes.types.includes(t)))businesses.push(item);
   if('@graph'in item)collect(item['@graph'],depth+1,schemaContext);
 };
 if(s){for(const raw of s.jsonld){if(raw.length===32_000&&s.limited){structuredLimited=true;continue;}try{collect(JSON.parse(raw));}catch{add("jsonInvalid","application/ld+json","medium","specialist","measured",undefined,"html",SEARCH_REFERENCES.local);}}
   if(!businesses.length)add("localMissing",[...new Set(types)].join(", "),"low","owner","possible",undefined,"html",SEARCH_REFERENCES.local);
   else {passed.push("localData");for(const business of businesses){const a=business.address;const useful=!!a&&typeof a==="object"&&!Array.isArray(a)&&["streetAddress","addressLocality","postalCode"].some(k=>typeof(a as Record<string,unknown>)[k]==="string"&&String((a as Record<string,unknown>)[k]).trim());
     if(typeof business.name!=="string"||!business.name.trim()||!useful)add("localInvalid",String(business['@type']),"medium","owner","measured",undefined,"html",SEARCH_REFERENCES.local);
     if(typeof business.telephone==="string"&&phones.length&&!phones.some(p=>p.replace(/\D/g,"")===String(business.telephone).replace(/\D/g,"")))add("contactMismatch",String(business.telephone),"low","owner","possible",undefined,"html",SEARCH_REFERENCES.local);
   }}
 }
 const open=version.doc.factsToConfirm.filter(f=>site.facts[f.fact]!=="confirmed");if(open.length)add("facts",open.slice(0,5).map(f=>f.fact).join("\n"),"medium","owner","measured",undefined,"document");
 if(e.target==="published"){
   if(e.page.status!==null&&e.page.status!==200)add("http",String(e.page.status),"high","specialist","measured",undefined,"http");else if(e.source==="http")passed.push("http");
   if(e.source!=="http")add("snapshot",e.page.error==="none"?String(e.page.status):e.page.error,"medium","specialist","possible",undefined,"http");
   if(e.robots.status===200&&!e.robots.limited&&/^text\/plain/i.test(e.robots.type)){if(blocksGoogleRoot(e.robots.body))add("crawlBlocked","Googlebot /","high","owner",/^\s*(?:allow|disallow)\s*:[^\r\n]*[?*%$]/im.test(e.robots.body)?"possible":"measured",undefined,"http",SEARCH_REFERENCES.robots);else passed.push("robots");}
   else add("robotsUnavailable",e.robots.status===null?e.robots.error:String(e.robots.status),e.robots.status!==null&&e.robots.status>=500?"medium":"low","specialist","possible",undefined,"http",SEARCH_REFERENCES.robots);
   if(e.sitemap.status!==200)add("sitemapUnavailable",e.sitemap.status===null?e.sitemap.error:String(e.sitemap.status),"low","specialist","possible",undefined,"http",SEARCH_REFERENCES.sitemap);
   else if(!s?.sitemap?.valid||e.sitemap.limited)add("sitemapInvalid","sitemap.xml","low","specialist","possible",undefined,"http",SEARCH_REFERENCES.sitemap);
   else if(!s.sitemap.locations.includes(e.url))add("sitemapMissingPage",e.url,"low","specialist","possible",undefined,"http",SEARCH_REFERENCES.sitemap);else passed.push("sitemap");
 }
 const rank={high:0,medium:1,low:2};findings.sort((a,b)=>rank[a.priority]-rank[b.priority]);
 return {id:e.id,at:new Date(e.at).toISOString(),target:e.target,version:version.n,fingerprint:e.fingerprint,url:e.url,source:e.source,findings:findings.slice(0,100),title:meta.title,description:meta.description,lang:meta.lang,h1Count:s?s.h1.length:-1,types:[...new Set(types)].slice(0,100),passed,browser:!!s,limited:meta.limited||structuredLimited||!!s?.sitemap?.limited||e.page.limited||e.robots.limited||e.sitemap.limited||findings.length>100,pageStatus:e.page.status,robotsStatus:e.robots.status,sitemapStatus:e.sitemap.status,unavailable:e.target==="published"&&e.source!=="http",customCode:version.doc.sections.some(v=>v.composition==="embed.code")};
}
