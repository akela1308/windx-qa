// Только фиксированные синтетические брифы. Не запускает AI.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const root='data/verification/palette-type-2026-11-04';await mkdir(root,{recursive:true});
const cases=JSON.parse(await readFile('experiments/diversity/cases.json','utf8')) as {id:string;brief:string}[];
const controls=JSON.parse(await readFile('experiments/visual-character/controls.json','utf8')) as {id:string;brief:string}[];
const holdouts=JSON.parse(await readFile('experiments/visual-character/holdouts.json','utf8')) as {id:string;brief:string}[];
const suffix=(await readFile('experiments/diversity/brief-suffix.txt','utf8')).trimEnd();
for(const c of [...cases,...controls,...holdouts]){
 const content=c.brief+'\n\n'+suffix,file=path.join(root,c.id+'.txt');
 const old=await readFile(file,'utf8').catch((e:{code?:string})=>{if(e.code!=='ENOENT')throw e;return null;});
 if(old!==null&&old!==content)throw Error('Existing brief differs: '+c.id);
 await writeFile(file,content);
}
console.log('Six paired briefs, two additional contexts and two owner-choice controls prepared. No AI requests.');
