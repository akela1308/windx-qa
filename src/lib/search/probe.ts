import { liveUrl } from "@/lib/sites/publish";
import type { PublicProbe } from "./types";
export function emptyProbe(error:PublicProbe["error"]):PublicProbe {return {status:null,body:"",type:"",robots:"",version:"",publication:"",limited:false,error};}
export function searchPublicUrl(slug:string) {
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>63)throw Error("Invalid public slug");
  const url=new URL(liveUrl(slug));
  if(url.username||url.password||url.pathname!=="/"||url.search||url.hash)throw Error("Invalid public origin");
  return url;
}
// Только три фиксированных адреса нашего опубликованного сайта. Не переходим
// по редиректам и не загружаем ни одного URL из HTML, robots или sitemap.
export async function probePublic(url:URL,path:"/"|"/robots.txt"|"/sitemap.xml",fetcher:typeof fetch=fetch):Promise<PublicProbe> {
  if(process.env.WINDX_SEARCH_HTTP==="0")return emptyProbe("disabled");
  const target=new URL(path,url);
  target.searchParams.set("windx-check",String(Date.now()));
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
  try {
    const response=await fetcher(target,{signal:controller.signal,redirect:"error",credentials:"omit",cache:"no-store",headers:{Accept:path==="/"?"text/html":path.endsWith(".xml")?"application/xml,text/xml":"text/plain","User-Agent":"WINDX-Site-Check/1.0"}});
    const max=path==="/"?384_000:path==="/robots.txt"?32_000:128_000;
    const chunks:Uint8Array[]=[];let size=0,limited=false;
    const reader=response.body?.getReader();
    if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){limited=true;await reader.cancel();break;}chunks.push(value);}
    return {status:response.status,body:Buffer.concat(chunks).toString("utf8"),type:(response.headers.get("content-type")??"").slice(0,400),robots:(response.headers.get("x-robots-tag")??"").slice(0,400),version:(response.headers.get("x-windx-version")??"").slice(0,400),publication:(response.headers.get("x-windx-publication")??"").slice(0,400),limited,error:"none"};
  } catch {return emptyProbe("unavailable");} finally {clearTimeout(timeout);}
}
