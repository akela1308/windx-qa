import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Styles } from "@/components/home/Styles";
import { getDict } from "@/lib/i18n";
import {templateShot} from "@/lib/showcase";
import { TEMPLATE_STYLES, TEMPLATE_CATALOG_ORDER } from "@/lib/templates";
export default function TemplatesPage(){return <Suspense fallback={<div className="min-h-dvh"/>}><TemplatesContent/></Suspense>;}
async function TemplatesContent(){
 const {t}=await getDict(),p=t.templatesPage;
 return <>
  <section id="templates" className="mx-auto w-full max-w-[1400px] scroll-mt-8 px-5 pt-12 md:px-10 md:pt-16">
   <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">{p.title}</h1>
   <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-muted">{p.sub}</p>
   <nav aria-label={p.title} className="mt-6 flex flex-wrap gap-3"><a href="#templates" className="rounded-full border border-ink px-5 py-3">{p.trades}</a><a href="#looks" className="rounded-full border border-ink px-5 py-3">{p.looks} ↗</a></nav>
   <h2 className="mt-12 font-display text-2xl font-bold">{p.trades}</h2>
   <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-12 xl:grid-cols-2">
    {TEMPLATE_CATALOG_ORDER.map(i=><li key={i}>
     <Link href={`/templates/${i}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-line bg-panel"><Image src={templateShot(i)} alt={t.home.trades[i]} width={1280} height={860} sizes="(min-width:1280px) 40vw, 90vw" className="aspect-[16/11] h-auto w-full object-cover object-top"/></div>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-display text-lg font-bold">{t.home.trades[i]}</h3><span className="min-h-11 py-2 text-sm underline underline-offset-4">{t.home.previewStyle} ↗</span></div>
     </Link>
     <p className="text-sm text-muted">{(t.styleNames as Record<string,string[]>)[TEMPLATE_STYLES[i]][0]}</p>
     <Link href={`/?t=${i}&style=${TEMPLATE_STYLES[i]}#create`} className="mt-2 inline-flex min-h-11 items-center text-sm underline underline-offset-4">{p.use}</Link>
    </li>)}
   </ul>
  </section>
  <Styles t={t}/>
 </>;
}
