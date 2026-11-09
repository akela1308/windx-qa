// Подготавливает фиксированные синтетические брифы. Ничего не отправляет в AI.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const root=process.argv[2]??'data/verification/business-diversity-2026-11-04';
const cases=JSON.parse(await readFile('experiments/diversity/cases.json','utf8')) as {id:string;brief:string}[];
const suffix=(await readFile('experiments/diversity/brief-suffix.txt','utf8')).trimEnd();
await mkdir(root,{recursive:true});
for(const c of cases){
 const file=path.join(root,c.id+'.txt'),text=c.brief+'\n\n'+suffix;
 const old=await readFile(file,'utf8').catch((e:{code?:string})=>{if(e.code!=='ENOENT')throw e;return null;});
 if(old!==null&&old!==text)throw Error('Refusing to change an existing paired brief: '+c.id);
 await writeFile(file,text);
}
console.log('Six fixed briefs prepared. No AI requests or publication.');
