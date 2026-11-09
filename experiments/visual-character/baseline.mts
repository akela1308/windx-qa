// Используем прежнюю реальную серию, без ещё шести оплачиваемых генераций.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {snapshotFromHtml} from './metrics';
const source='data/verification/business-diversity-2026-11-04',root='data/verification/palette-type-2026-11-04';
const cases=JSON.parse(await readFile('experiments/diversity/cases.json','utf8')) as {id:string}[];
await mkdir(root,{recursive:true});
for(const c of cases){const file=`after-${c.id}`,original=JSON.parse(await readFile(path.join(source,file+'.json'),'utf8')),html=await readFile(path.join(source,file+'.html'),'utf8');await writeFile(path.join(root,`before-${c.id}.json`),JSON.stringify({caseId:c.id,phase:'before',url:original.url,...snapshotFromHtml(html),sourceCommit:'249711d'},null,2));await copyFile(path.join(source,file+'.html'),path.join(root,`before-${c.id}.html`));}
console.log('Six previous real results imported as the baseline. No new AI requests.');
