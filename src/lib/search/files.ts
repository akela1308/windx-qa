import { mkdir,readdir,readFile,writeFile,link,unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { SearchReport } from "./types";
export class SearchCheckLimit extends Error {}
const queues=new Map<string,Promise<unknown>>();
export async function saveSearchReport(dir:string,report:SearchReport):Promise<SearchReport>{
 const pending=(queues.get(dir)??Promise.resolve()).catch(()=>{}).then(()=>writeReport(dir,report));queues.set(dir,pending);
 try{return await pending;}finally{if(queues.get(dir)===pending)queues.delete(dir);}
}
async function writeReport(dir:string,report:SearchReport){
 if(!/^[a-f0-9-]{36}$/.test(report.id)||!Number.isFinite(Date.parse(report.at)))throw Error("Invalid report");
 await mkdir(dir,{recursive:true,mode:0o700});const file=path.join(dir,`${report.at.replace(/[^0-9]/g,"")}-${report.id}.json`);
 try{return JSON.parse(await readFile(file,"utf8")) as SearchReport;}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
 const cutoff=new Date(Date.now()-3600_000).toISOString().replace(/[^0-9]/g,"");
 if((await readdir(dir)).filter(name=>/^\d{17}-[a-f0-9-]{36}\.json$/.test(name)&&name.slice(0,17)>=cutoff).length>=30)throw new SearchCheckLimit();
 const temp=`${file}.${randomUUID()}.tmp`;await writeFile(temp,JSON.stringify(report),{mode:0o600,flag:"wx"});
 try{await link(temp,file);}catch(e){if((e as NodeJS.ErrnoException).code!=="EEXIST")throw e;}finally{await unlink(temp);}
 return JSON.parse(await readFile(file,"utf8")) as SearchReport;
}
export async function listSearchReports(dir:string,limit=10):Promise<SearchReport[]>{
 let names:string[];try{names=await readdir(dir);}catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return [];throw e;}
 return Promise.all(names.filter(v=>/^\d{17}-[a-f0-9-]{36}\.json$/.test(v)).sort().reverse().slice(0,Math.min(50,Math.max(1,limit))).map(async name=>JSON.parse(await readFile(path.join(dir,name),"utf8")) as SearchReport));
}
