// Анализирует уже снятые результаты, не вызывает AI и не управляет браузером.
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {summariseCaptures,type Capture} from './metrics';
const root=process.argv[2]??'data/verification/business-diversity-2026-11-04';
const cases=JSON.parse(await readFile('experiments/diversity/cases.json','utf8')) as {id:string}[];
const expected=new Set(cases.flatMap(c=>['before','candidate','after'].map(phase=>`${phase}-${c.id}.json`)));
const files=(await readdir(root)).filter(f=>expected.has(f));
const results:Capture[]=await Promise.all(files.map(async f=>{
 const result=JSON.parse(await readFile(path.join(root,f),'utf8')) as Capture;
 if(`${result.phase}-${result.caseId}.json`!==f)throw Error('Capture is assigned to the wrong case: '+f);
 return result;
}));
console.log(JSON.stringify({phases:summariseCaptures(results)},null,2));
