import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import { contentSections } from '../src/lib/content/fields';
import { CODE_DRAFT_TTL } from '../src/lib/editor-drafts/code';
import { TextDraftNotice } from '../src/components/editor/TextDraftNotice';
import { textDraftScope, textDraftKey, writeTextDraft, readTextDrafts, canRestoreText, textDraftChanges, clearTextDrafts, type TextDraft } from '../src/lib/editor-drafts/text';
const data=new Map<string,string>();
const storage={get length(){return data.size;},key:(i:number)=>[...data.keys()][i]??null,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
const now=Date.now(),scope=textDraftScope('owner-a','site-a');
const doc=JSON.parse(await readFile('docs/experiment-1c/outputs/yoga/light.json','utf8'));
const sections=contentSections(doc),section=sections.find(s=>s.index>=0&&s.fields.some(f=>f.kind!=='photo'))!;
const field=section.fields.find(f=>f.kind!=='photo')!;
const draft:TextDraft={format:1,baseVersion:5,index:section.index,composition:section.composition,savedAt:now,changes:[{path:field.path,value:'DEMO ONLY'}]};
writeTextDraft(storage,scope,draft);
assert.deepEqual(readTextDrafts(storage,scope,now),[draft]);
assert.equal(canRestoreText(draft,5,sections),true);
assert.equal(canRestoreText(draft,6,sections),false);
assert.equal(canRestoreText(draft,5,sections.filter(s=>s.index!==draft.index)),false);
assert.equal(canRestoreText({...draft,composition:'other'},5,sections),false);
assert.equal(canRestoreText({...draft,changes:[{path:'not.a.field',value:'x'}]},5,sections),false);
assert.equal(canRestoreText({...draft,changes:[{path:field.path,value:'x'.repeat(field.max+1)}]},5,sections),false);
const photoSection=sections.find(s=>s.fields.some(f=>f.kind==='photo'))!;
assert.equal(canRestoreText({...draft,index:photoSection.index,composition:photoSection.composition,changes:[{path:photoSection.fields.find(f=>f.kind==='photo')!.path,value:'/media/not-owned.webp'}]},5,sections),false);
assert.deepEqual(readTextDrafts(storage,textDraftScope('owner-b','site-a'),now),[]);
assert.deepEqual(readTextDrafts(storage,textDraftScope('owner-a','site-b'),now),[]);
assert.notEqual(textDraftScope('a:b','c'),textDraftScope('a','b:c'));
const meta:TextDraft={...draft,index:-1,composition:'meta',changes:[{path:'title',value:'DEMO ONLY metadata'}]};
writeTextDraft(storage,scope,meta);assert.equal(readTextDrafts(storage,scope,now).length,2);
assert.equal(canRestoreText(meta,5,sections),true);
storage.removeItem(textDraftKey(scope,draft.index));assert.deepEqual(readTextDrafts(storage,scope,now),[meta]);
for(const section of sections){
 const values=Object.fromEntries(section.fields.map(f=>[f.path,f.kind==='photo'?{src:'/media/synthetic.webp',subject:'unsaved image'}:f.value]));
 assert.deepEqual(textDraftChanges(section,values),[],'Photo changes are excluded');
 for(const f of section.fields.filter(f=>f.kind!=='photo')) values[f.path]='';
 const changes=textDraftChanges(section,values);
 assert.ok(changes.every(c=>typeof c.value==='string'&&section.fields.find(f=>f.path===c.path)?.kind!=='photo'));
 // Empty input is kept for recovery, then validated by the normal server action.
 assert.ok(changes.every(c=>c.value===''));
}
for(const raw of ['{',JSON.stringify({...draft,format:2}),JSON.stringify({...draft,changes:[]}),JSON.stringify({...draft,changes:[{path:'__proto__.x',value:'x'}]}),JSON.stringify({...draft,resolvedFacts:['unconfirmed']}),JSON.stringify({...draft,changes:[...draft.changes,...draft.changes]}),JSON.stringify({...draft,changes:[{path:field.path,value:'x'.repeat(5001)}]}),'x'.repeat(700001)]){
 storage.setItem(textDraftKey(scope,draft.index),raw);
 assert.ok(!readTextDrafts(storage,scope,now).some(d=>d.index===draft.index));
 assert.equal(storage.getItem(textDraftKey(scope,draft.index)),null);
}
writeTextDraft(storage,scope,draft);assert.deepEqual(readTextDrafts(storage,scope,now+CODE_DRAFT_TTL+1),[]);
writeTextDraft(storage,scope,{...draft,savedAt:now+60001});assert.deepEqual(readTextDrafts(storage,scope,now),[]);
assert.throws(()=>writeTextDraft({...storage,setItem:()=>{throw Error('QuotaExceededError');}},scope,draft),/Quota/);
for(const locale of ['en','ru','es']){
 const text={...draft,changes:[{path:field.path,value:'<script>DEMO_ONLY()</script>'}]};
 const html=renderToStaticMarkup(createElement(TextDraftNotice,{draft:text,locale,stale:false,restore:()=>{},discard:()=>{}}));
 assert.ok(!html.includes('<script>DEMO_ONLY()'));assert.match(html,/&lt;script&gt;/);assert.match(html,/readOnly/i);
 const stale=renderToStaticMarkup(createElement(TextDraftNotice,{draft:text,locale,stale:true,restore:()=>{},discard:()=>{}}));
 assert.equal((stale.match(/<button/g)||[]).length,1);
}
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
try{
 Object.defineProperty(globalThis,'window',{value:{localStorage:storage},configurable:true});
 writeTextDraft(storage,scope,draft);storage.setItem('windx:code-draft:v1:qa','code');storage.setItem('unrelated','keep');
 clearTextDrafts();assert.equal(storage.getItem(textDraftKey(scope,draft.index)),null);assert.equal(storage.getItem('unrelated'),'keep');assert.equal(storage.getItem('windx:code-draft:v1:qa'),'code');
}finally{if(descriptor)Object.defineProperty(globalThis,'window',descriptor);else Reflect.deleteProperty(globalThis,'window');}
console.log('PASS text drafts: per-account/site/section isolation, metadata, multi-section retention, text-only changes, version/field/type/length gates, bounded/expired/corrupt data, quota error, inert EN/RU/ES UI and targeted logout cleanup');
