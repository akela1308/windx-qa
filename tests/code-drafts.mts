import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CODE_DRAFT_TTL, codeDraftKey, readCodeDraft, writeCodeDraft, type CodeDraft } from '../src/lib/editor-drafts/code';
import { CodeDraftNotice } from '../src/components/editor/CodeDraftNotice';
const data = new Map<string,string>();
const storage = { get length(){return data.size;}, key:(i:number)=>[...data.keys()][i]??null, getItem:(k:string)=>data.get(k)??null, setItem:(k:string,v:string)=>{data.set(k,v);}, removeItem:(k:string)=>{data.delete(k);} };
const now = Date.now(), key = codeDraftKey('owner-a','site-a');
const draft:CodeDraft = {format:1,baseVersion:5,selection:'new',savedAt:now,values:{title:'QA',html:'<script>DEMO_ONLY()</script>',css:'p { color: red; }',js:'/* QA */',height:'',mobileHeight:'500',after:'footer'}};
writeCodeDraft(storage,key,draft);
assert.deepEqual(readCodeDraft(storage,key,now),draft);
assert.equal(readCodeDraft(storage,codeDraftKey('owner-b','site-a'),now),null);
assert.equal(readCodeDraft(storage,codeDraftKey('owner-a','site-b'),now),null);
assert.notEqual(codeDraftKey('a:b','c'),codeDraftKey('a','b:c'));
for(const raw of ['{',JSON.stringify({...draft,format:2}),JSON.stringify({...draft,selection:'../other'}),JSON.stringify({...draft,values:{...draft.values,html:'x'.repeat(50001)}}),JSON.stringify({...draft,values:{...draft.values,secret:'unrecognized'}})]){
 storage.setItem(key,raw);assert.equal(readCodeDraft(storage,key,now),null);assert.equal(storage.getItem(key),null);
}
writeCodeDraft(storage,key,draft);assert.equal(readCodeDraft(storage,key,now+CODE_DRAFT_TTL+1),null);
writeCodeDraft(storage,key,{...draft,savedAt:now+60001});assert.equal(readCodeDraft(storage,key,now),null);
const denied = {...storage,setItem:()=>{throw new Error('QuotaExceededError');}};
assert.throws(()=>writeCodeDraft(denied,key,draft),/Quota/);
for(const locale of ['en','ru','es']){
 const html=renderToStaticMarkup(createElement(CodeDraftNotice,{draft,locale,stale:false,restore:()=>{},discard:()=>{}}));
 assert.ok(!html.includes('<script>DEMO_ONLY()'));assert.match(html,/&lt;script&gt;/);assert.match(html,/readonly/i);
 const stale=renderToStaticMarkup(createElement(CodeDraftNotice,{draft,locale,stale:true,restore:()=>{},discard:()=>{}}));
 assert.equal((stale.match(/<button/g)||[]).length,1,'Stale draft cannot restore into a different site version');
}
console.log('PASS code drafts: account/site namespaces, bounded strict data, invalid/expired cleanup, storage failure propagation, inert escaped code and stale recovery gate in EN/RU/ES');
