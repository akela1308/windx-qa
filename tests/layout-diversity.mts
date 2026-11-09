import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {validateDoc} from '../src/lib/design';
import {renderDoc} from '../src/lib/design/render';
import {SiteDocSchema,COMPOSITIONS} from '../experiments/exp1/a/schema';
import {contentSections,writeField} from '../src/lib/content/fields';
import {validateEditDoc,describeChanges} from '../src/lib/sites/edit-review';
import {creationSystem,editingSystem,planCreation} from '../src/lib/ai/operation-plan';

const base=JSON.parse(await readFile('docs/experiment-1c/outputs/bike/light.json','utf8'));
const root=path.join('data','verification','layout-diversity-2026-11-04','fixtures');await mkdir(root,{recursive:true});
const graphic={label:'Abstract sheets connected in a short workflow',paths:[{d:'M40 50 H180 V230 H40 Z M65 90 H150 M65 120 H150 M65 150 H120',color:'ink',fill:false},{d:'M210 90 H320 V180 H210 Z M180 140 H210 M320 140 H360',color:'accent',fill:false}]};
const copy={headline:'Sheets you can work with',sub:'Spreadsheet cleanup and workflow prototypes, explained before the work starts.',cta:{label:'Explore services',href:'#services'}};
const items=[{name:'Spreadsheet cleanup',description:'Dates, names and repeated rows made consistent.',cta:{label:'See the workflow',href:'#services'}},{name:'Workflow prototypes',description:'A small working example of a repeated task.',cta:{label:'Back to the start',href:'#start'}}];
const section=(composition:string,id:string,props:unknown)=>({composition,id,tone:'default',props});
const heroes=[section('hero.split-graphic','start',{...copy,graphic,graphicSide:'right'}),section('hero.action-desk','start',{...copy,actionsTitle:'Find what you need',actions:items.map(i=>({title:i.name,detail:i.description,link:i.cta}))}),section('hero.center-stage','start',{...copy,graphic})];
const services=[section('services.staggered','services',{title:'Services',items}),section('services.disclosure','services',{title:'Services',items}),section('services.feature-plus-list','services',{title:'Services',featured:items[0],others:[items[1]]})];
const names=['split','desk','stage'];const docs=heroes.map((hero,i)=>SiteDocSchema.parse({meta:{businessName:'DEMO ONLY Layout Lab',title:'Layout comparison',description:'The same content and colours with different compositions.'},rationale:'A local comparison of layout, without changing the visual tokens.',tokens:base.tokens,sections:[section('header.inline','top',{name:'DEMO ONLY Layout Lab',links:[{label:'Services',href:'#services'}]}),hero,services[i],section('footer.simple','end',{name:'DEMO ONLY Layout Lab',lines:['Synthetic test, not a real business'],links:[]})],factsToConfirm:[]}));
for(const [i,doc]of docs.entries()){
 assert.ok(validateDoc(doc).ok,names[i]);assert.deepEqual(doc.tokens,docs[0].tokens,'Palette and typography identical; only layouts differ');
 const html=renderDoc(doc);assert.match(html,/data-section="hero\./);assert.ok(!html.includes('Photo:'));assert.ok(!html.includes('services.cards'));assert.ok(!html.includes('dangerouslySetInnerHTML'));
 await writeFile(path.join(root,`${names[i]}.html`),html);await writeFile(path.join(root,`${names[i]}.json`),JSON.stringify(doc,null,2));
 const manual=structuredClone(doc),field=contentSections(manual).find(s=>s.index===1)!.fields.find(f=>f.path==='headline')!;assert.ok(field);writeField(manual.sections[1].props,field.path,'A manually edited heading');assert.ok(validateEditDoc(manual,doc).ok);
 assert.ok(!contentSections(doc).flatMap(s=>s.fields).some(f=>/paths|graphicSide/.test(f.path)),'Geometry does not leak into ordinary text fields');
 const renamed=structuredClone(doc);renamed.meta.title='Edited layout comparison';assert.ok(validateDoc(renamed).ok);
 assert.equal(doc.sections.filter(s=>s.composition.startsWith('hero.')).length,1);
}
assert.ok(describeChanges(docs[0],docs[1]).some(c=>c.layout),'Composition change visible before applying');
const mirrored=structuredClone(docs[0]);(mirrored.sections[1].props as {graphicSide:string}).graphicSide='left';assert.ok(describeChanges(docs[0],mirrored).some(c=>c.layout),'Moving a graphic also appears as a layout change before applying');
for(const bad of ['<script>alert(1)</script>','M0 0\" onload=\"x','M1 1 url(https://example.test)']){
 const doc=structuredClone(docs[0]);(doc.sections[1].props as {graphic:typeof graphic}).graphic.paths[0].d=bad;assert.equal(validateDoc(doc).ok,false);
}
const oldFiles=['docs/experiment-1c/outputs/bike/light.json','docs/experiment-1c/outputs/bike/dark.json','docs/experiment-1c/outputs/law/light.json','docs/experiment-1c/outputs/yoga/light.json'];for(const file of oldFiles)assert.ok(validateDoc(JSON.parse(await readFile(file,'utf8'))).ok,'Existing saved documents still valid');
const system=await creationSystem('en');for(const name of [...heroes,...services].map(s=>s.composition))assert.ok(system.includes(name),name);
const schemaLine=system.split('\n').find(line=>line.startsWith('{"$schema"'))!;const advertised=JSON.parse(schemaLine).properties.sections.items.oneOf as {properties:{composition:{const:string}}}[];
assert.deepEqual(advertised.map(s=>s.properties.composition.const).sort(),Object.keys(COMPOSITIONS).sort(),'Runtime and AI catalogue schema agree');
assert.ok(!system.includes('Use 8 to 12 sections'));assert.ok(!(await editingSystem('en')).includes('## Composition follows content'));
const plan=await planCreation('A local mock brief',undefined,'en');assert.equal(plan.summary.requestsMax,2,'No extra style or layout AI calls');
console.log('PASS: three structurally distinct documents with identical tokens, all five new compositions render, typed graphic injection rejected, manual edits and change review, old documents, synchronized AI schema, creation-only diversity guidance and unchanged request limits. No external AI.');
