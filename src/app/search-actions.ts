"use server";
import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { getStore } from "@/lib/storage";
import { currentIdentity } from "@/lib/auth/session";
import { slugFor } from "@/lib/sites/publish";
import { renderDoc } from "@/lib/design/render";
import { analyseSearch,searchFingerprint,searchHtmlHash } from "@/lib/search/analyse";
import { probePublic,searchPublicUrl,emptyProbe } from "@/lib/search/probe";
import { signSearchEvidence,verifySearchEvidence } from "@/lib/search/signature";
import { SearchSnapshotSchema,type SearchEvidence } from "@/lib/search/types";
import { SearchCheckLimit } from "@/lib/search/files";
async function context(siteId:string,target:"draft"|"published"){
 const store=await getStore(),site=await store.getSite(siteId);
 if(!site||(await currentIdentity())?.guest&&site.published)throw Error("Site unavailable");
 if(target==="published"&&!site.published)throw Error("Not published");
 const version=await store.getVersion(siteId,target==="published"?site.published!.version:site.currentVersion);if(!version)throw Error("Missing version");
 const url=searchPublicUrl(await slugFor(site));return {store,site,version,url};
}
// Ограничиваем старт сетевой проверки независимо от сохранения отчёта.
const starts=new Map<string,{n:number;until:number}>();
export async function startSearchAction(siteId:string,target:"draft"|"published"){
 try{
   if(target!=="draft"&&target!=="published")return {ok:false as const};
   const {site,version,url}=await context(siteId,target),now=Date.now();
   for(const [key,value]of starts)if(value.until<=now)starts.delete(key);
   const bucket=starts.get(siteId)??{n:0,until:now+60_000};starts.set(siteId,bucket);if(++bucket.n>6)return {ok:false as const,limited:true};
   const fingerprint=searchFingerprint(site,version,target,url.href),snapshot=renderDoc(version.doc);
   const [page,robots,sitemap]=target==="published"?await Promise.all([probePublic(url,"/"),probePublic(url,"/robots.txt"),probePublic(url,"/sitemap.xml")]):[emptyProbe("notPublished"),emptyProbe("notPublished"),emptyProbe("notPublished")];
   const actual=target==="published"&&page.status===200&&page.type.toLowerCase().startsWith("text/html")&&!page.limited&&page.version===String(version.n)&&page.publication===site.published!.at;
   const html=actual?page.body:snapshot;
   const {body:_body,...pageInfo}=page;void _body;
   const evidence:SearchEvidence={id:randomUUID(),at:Date.now(),siteId,target,version:version.n,url:url.href,fingerprint,htmlHash:searchHtmlHash(html),page:pageInfo,robots,sitemap,source:actual?"http":"generated"};
   return {ok:true as const,evidence,signature:await signSearchEvidence(evidence),html};
 }catch{return {ok:false as const};}
}
export async function finishSearchAction(siteId:string,raw:unknown,signature:string,snapshot:unknown){
 try{
   const evidence=await verifySearchEvidence(raw,signature);if(evidence.siteId!==siteId)return {ok:false as const};
   const {site,version,url,store}=await context(siteId,evidence.target);
   if(searchFingerprint(site,version,evidence.target,url.href)!==evidence.fingerprint)return {ok:false as const,stale:true};
   const browser=snapshot===null?null:SearchSnapshotSchema.parse(snapshot);
   const report=await store.saveSearchReport(siteId,analyseSearch(site,version,evidence,browser));refresh();return {ok:true as const,report};
 }catch(error){return {ok:false as const,limited:error instanceof SearchCheckLimit};}
}
