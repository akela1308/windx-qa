// Prepare the exact current public documents, without launching a browser or AI.
// Capture these URLs in the browser at 1280×860, then run finalize-catalog-shots.mts.
import {mkdir,writeFile} from 'node:fs/promises';
import {SHOWCASE} from '../src/lib/showcase';
import {TEMPLATE_BRIEFS} from '../src/lib/templates';
import {readCatalogueDocument} from '../src/lib/catalog';
import {renderDoc} from '../src/lib/design/render';
const root='data/verification/catalogue-2026-11-04';await mkdir(root,{recursive:true});
const plan=[...SHOWCASE.map(id=>({id,url:`/examples/${id}?canvas=1`,file:`${id}.json`})),...TEMPLATE_BRIEFS.map((_,i)=>({id:`template-${i}`,url:`/templates/${i}?canvas=1`,file:`template-${i}.json`}))];
for(const p of plan)await writeFile(`${root}/${p.id}.html`,renderDoc(await readCatalogueDocument(p.file)));
await writeFile(`${root}/capture-plan.json`,JSON.stringify(plan,null,2)+'\n');
console.log('Prepared 23 public HTML documents and a capture plan. No AI calls, browser launches or screenshots.');
