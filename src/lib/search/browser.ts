import { inspectHtml } from "@/lib/checks/isolated-page";
import type { SearchSnapshot } from "./types";
export function searchSnapshot(doc:Document,sitemapText:string):SearchSnapshot {
 const sections=[...doc.querySelectorAll("[data-section]")],sectionOf=(el:Element)=>sections.indexOf(el.closest("[data-section]")!);
 const text=(value:string|null,max=400)=>(value??"").trim().slice(0,max);
 const descriptions=[...doc.head.querySelectorAll('meta[name="description" i]')];
 const headers=[...doc.querySelectorAll("h1")],links=[...doc.querySelectorAll("a[href]")],scripts=[...doc.querySelectorAll('script[type="application/ld+json" i]')];
 const canonicals=[...doc.head.querySelectorAll('link[rel~="canonical" i]')],robots=[...doc.head.querySelectorAll('meta[name="robots" i],meta[name="googlebot" i]')];
 let sitemap:SearchSnapshot["sitemap"]=null;
 if(sitemapText){
   if(/<!DOCTYPE|<!ENTITY/i.test(sitemapText))sitemap={valid:false,locations:[],limited:false};
   else {const xml=new DOMParser().parseFromString(sitemapText,"application/xml");const root=xml.documentElement;
     const locations=[...xml.getElementsByTagNameNS("*","loc")];
     sitemap={valid:!xml.querySelector("parsererror")&&root.localName==="urlset"&&root.namespaceURI==="http://www.sitemaps.org/schemas/sitemap/0.9",locations:locations.slice(0,500).map(el=>text(el.textContent)),limited:locations.length>500};}
 }
 // Не включаем исходники виджетов, скриптов и стилей в языковую эвристику.
 const body=doc.body.cloneNode(true) as HTMLElement;body.querySelectorAll("script,style,iframe,.eq-trap").forEach(el=>el.remove());
 return {title:text(doc.title),titleCount:Math.min(doc.head.querySelectorAll("title").length,100),description:text(descriptions[0]?.getAttribute("content")??"",1000),descriptionCount:Math.min(descriptions.length,100),lang:text(doc.documentElement.lang),h1:headers.slice(0,100).map(el=>({section:sectionOf(el),text:text(el.textContent)})),robots:robots.slice(0,20).map(el=>text(el.getAttribute("content"))),canonicals:canonicals.slice(0,20).map(el=>text(el.getAttribute("href"))),links:links.slice(0,250).map(el=>{const href=el.getAttribute("href")??"";let targetExists=true;if(href.startsWith("#")&&href!=="#"){try{targetExists=!!doc.getElementById(decodeURIComponent(href.slice(1)));}catch{targetExists=false;}}return {section:sectionOf(el),href:text(href),targetExists};}),jsonld:scripts.slice(0,8).map(el=>text(el.textContent,32_000)),text:text(body.textContent,20_000),missingAlt:Math.min(doc.querySelectorAll("img:not([alt])").length,1000),sitemap,limited:headers.length>100||links.length>250||scripts.length>8||scripts.some(el=>(el.textContent?.length??0)>32_000)||canonicals.length>20||robots.length>20};
}
export function measureSearchHtml(html:string,sitemap:string){return inspectHtml(html,1200,doc=>searchSnapshot(doc,sitemap));}
