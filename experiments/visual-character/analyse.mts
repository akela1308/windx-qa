// Читает только снятые результаты, не обращается к AI.
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {snapshotFromHtml,summariseCharacters,type CharacterCapture} from './metrics';
const root=process.argv[2]??'data/verification/palette-type-2026-11-04';
const known=['bike','law','yoga','cafe','pottery','bookkeeping','brand','warm','music','press'];
const names=new Set(known.flatMap(id=>['before','after','holdout','control'].map(phase=>`${phase}-${id}.json`)));
const files=(await readdir(root)).filter(file=>names.has(file));
const captures=await Promise.all(files.map(async file=>{const c=JSON.parse(await readFile(path.join(root,file),'utf8')) as CharacterCapture;if(`${c.phase}-${c.caseId}.json`!==file)throw Error('Mismatched capture: '+file);const html=await readFile(path.join(root,file.replace(/\.json$/,'.html')),'utf8');return {...c,heroTone:snapshotFromHtml(html).heroTone};}));
console.log(JSON.stringify({phases:summariseCharacters(captures)},null,2));
