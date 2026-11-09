import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SHOWCASE} from '../src/lib/showcase';
import {EXAMPLE_SITES} from '../src/lib/example-sites';
import {TEMPLATE_BRIEFS,TEMPLATE_STYLES,templateIndex} from '../src/lib/templates';
import {readCatalogueDocument,templateReference} from '../src/lib/catalog';
import {getDirection,validateDoc} from '../src/lib/design';
import {creationCharacterErrors} from '../src/lib/design/creation-character';
import {planCreation,planEdit} from '../src/lib/ai/operation-plan';
import {en} from '../src/lib/i18n/en';
const before={...process.env};
try{
 process.env.AI_DEMO='1';const layouts=new Set<string>();
 for(const id of SHOWCASE){const doc=await readCatalogueDocument(EXAMPLE_SITES[id].replace('catalog/',''));const checked=validateDoc(doc,getDirection(id));assert.ok(checked.ok,`${id}: ${checked.ok?'':checked.errors.join(';')}`);assert.deepEqual(creationCharacterErrors(doc.tokens),[],id);const hero=doc.sections.find(s=>s.composition.startsWith('hero.'));assert.ok(hero);layouts.add(hero.composition);assert.equal(doc.sections.some(s=>['services.cards','enquiry.form','embed.code','free.canvas'].includes(s.composition)),false);}
 assert.ok(layouts.size>=6,'The catalogue must show different information layouts, not just recolours');
 assert.equal(TEMPLATE_STYLES.length,TEMPLATE_BRIEFS.length);
 for(let i=0;i<TEMPLATE_BRIEFS.length;i++){const doc=await readCatalogueDocument(`template-${i}.json`);assert.ok(validateDoc(doc,getDirection(TEMPLATE_STYLES[i])).ok,'template '+i);assert.deepEqual(creationCharacterErrors(doc.tokens),[]);assert.ok((await templateReference(String(i))).includes(doc.sections[1].composition));}
 for(const bad of [undefined,'','../0','12','0/1','-1'])assert.equal(templateIndex(bad),undefined);
 const a=await planCreation('A synthetic plumbing studio',undefined,'en');assert.equal(a.summary.customerCharge,'none');const b=await planCreation('A synthetic plumbing studio','clear-product','en','6');assert.notEqual(a.fingerprint,b.fingerprint);assert.ok(b.user?.includes('Explicitly selected starting template'));assert.ok(!b.system.includes('A synthetic plumbing studio'));assert.ok(!b.user?.includes('Clear Pipe'),'Do not copy demo names into the reference');const doc=await readCatalogueDocument('clear-product.json');const edit=await planEdit('brief',doc,'Change title','en',1,'synthetic');assert.notEqual(edit.summary.customerCharge,'none','Edit confirmation remains unchanged');
 const form=await readFile('src/components/home/PromptBox.tsx','utf8'),build=await readFile('src/components/home/BuildScreen.tsx','utf8'),hero=await readFile('src/components/home/Hero.tsx','utf8');assert.ok(!build.includes('fixed inset-0'));assert.ok(!hero.includes('rise mt-8'));assert.ok(!form.includes('setExecuting'));
 assert.equal(Object.keys(en.styleNames).length,SHOWCASE.length);
 console.log('PASS 11 public style references, 12 trade examples, loaded/contrasting typography, six hero layouts, explicit selection context, free-create policy and retained edit confirmation. No AI calls.');
}finally{process.env=before;}
