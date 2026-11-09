// Captured DOM only; no model calls, network or browser launch.
import{readFile,readdir}from'node:fs/promises';
import{assess,pairedLayouts,type Capture,type Expectation}from'./metrics';
const root=process.argv[2]??'data/verification/selection-study-2026-11-04';
const cases=JSON.parse(await readFile('experiments/selection-study/cases.json','utf8')) as {id:string}[];
const frozen=JSON.parse(await readFile(root+'/expectations.json','utf8')) as {cases:Expectation[]};
const names=new Set(cases.flatMap(c=>['before','after'].map(p=>`${p}-${c.id}.json`)));
const files=(await readdir(root)).filter(f=>names.has(f));const captures=await Promise.all(files.map(async f=>{const c=JSON.parse(await readFile(root+'/'+f,'utf8')) as Capture;if(`${c.phase}-${c.caseId}.json`!==f)throw Error('Mismatched capture '+f);return c;}));
const phases=['before','after'].map(phase=>{const rows=captures.filter(c=>c.phase===phase).map(c=>assess(c,frozen.cases.find(e=>e.caseId===c.caseId)!));return {phase,n:rows.length,pairs:pairedLayouts(rows),rows};}).filter(p=>p.n);
// Unchanged studio prompts retain their actual baseline observations. Do not
// duplicate them into the after series or present them as new model calls.
const changed=['bakery-product','bakery-clay','books-product','books-clay','barber-template','electric-template'];
const missingRepeats=changed.filter(id=>!captures.some(c=>c.phase==='after'&&c.caseId===id));
const latest=cases.map(({id})=>captures.find(c=>c.caseId===id&&c.phase==='after')??captures.find(c=>c.caseId===id&&c.phase==='before')).filter((c):c is Capture=>!!c);
const finalRows=latest.map(c=>assess(c,frozen.cases.find(e=>e.caseId===c.caseId)!));
const finalComparison=captures.some(c=>c.phase==='after')?{complete:!missingRepeats.length&&latest.length===cases.length,missingRepeats,n:latest.length,pairs:pairedLayouts(finalRows),rows:finalRows}:undefined;
console.log(JSON.stringify({phases,finalComparison},null,2));
