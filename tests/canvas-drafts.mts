import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {blankCanvas} from '../src/lib/free-editor/blank';
import {newElement} from '../src/lib/free-editor/examples';
import {commit,history,undo,redo,patchBox,PublishedCanvasSchema} from '../src/lib/free-editor/model';
import {canvasDraftScope,canvasDraftKey,readCanvasDrafts,writeCanvasDraft,canRestoreCanvas,clearCanvasDrafts,type CanvasDraft} from '../src/lib/editor-drafts/canvas';
import {CODE_DRAFT_TTL} from '../src/lib/editor-drafts/code';
import {CanvasDraftNotice} from '../src/components/free-editor/CanvasDraftNotice';
const data=new Map<string,string>();
const storage={get length(){return data.size;},key:(i:number)=>[...data.keys()][i]??null,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
const now=Date.now(),scope=canvasDraftScope('owner-a','site-a'),baseline=blankCanvas('QA','Original');
const changed=patchBox(patchBox({...baseline,elements:baseline.elements.map(e=>e.type==='text'?{...e,text:'<script>DEMO_ONLY()</script>',phoneSize:24,style:{...e.style,size:36}}:e)},'text-1','desktop',{x:100,width:900}),'text-1','phone',{x:32,width:300});
const draft:CanvasDraft={format:1,baseVersion:5,sectionId:null,savedAt:now,doc:changed,after:'2',device:'phone',selected:'text-1',links:{}};
writeCanvasDraft(storage,scope,'site-a',draft);
assert.deepEqual(readCanvasDrafts(storage,scope,'site-a',now),[draft]);
const rawLink={...draft,links:{'text-1':'javascript:DEMO_ONLY()'}};
writeCanvasDraft(storage,scope,'site-a',rawLink);assert.equal(readCanvasDrafts(storage,scope,'site-a',now)[0].links['text-1'],'javascript:DEMO_ONLY()');assert.equal(readCanvasDrafts(storage,scope,'site-a',now)[0].doc.elements[0].type,'text');
writeCanvasDraft(storage,scope,'site-a',draft);
assert.throws(()=>writeCanvasDraft(storage,scope,'site-a',{...draft,links:{unknown:'https://example.com'}}));
assert.equal(canRestoreCanvas(draft,5,null,[]),true);assert.equal(canRestoreCanvas(draft,6,null,[]),false);
assert.equal(canRestoreCanvas({...draft,sectionId:'free-one'},5,'free-one',['free-one']),true);
assert.equal(canRestoreCanvas({...draft,sectionId:'free-one'},5,'free-two',['free-one','free-two']),false);
assert.equal(canRestoreCanvas({...draft,sectionId:'free-one'},5,'free-one',[]),false);
assert.deepEqual(readCanvasDrafts(storage,canvasDraftScope('owner-b','site-a'),'site-a',now),[]);
assert.deepEqual(readCanvasDrafts(storage,canvasDraftScope('owner-a','site-b'),'site-b',now),[]);
assert.notEqual(canvasDraftScope('a:b','c'),canvasDraftScope('a','b:c'));
writeCanvasDraft(storage,scope,'site-a',{...draft,sectionId:'free-one'});assert.equal(readCanvasDrafts(storage,scope,'site-a',now).length,2);
storage.removeItem(canvasDraftKey(scope,null));assert.equal(readCanvasDrafts(storage,scope,'site-a',now)[0].sectionId,'free-one');
// После восстановления Undo возвращает исходный холст, Redo возвращает обе раскладки.
const restored=commit(history(baseline),draft.doc);
assert.deepEqual(undo(restored).present,baseline);assert.deepEqual(redo(undo(restored)).present,draft.doc);
assert.equal(draft.doc.elements[0].desktop.x,100);assert.equal(draft.doc.elements[0].phone.x,32);
const photo=newElement('image','image-qa');assert.equal(photo.type,'image');
if(photo.type!=='image')throw Error();photo.src='/media/site-a/12345678-1234-1234-1234-123456789abc.webp';photo.alt='Synthetic owner image';
const imageDraft={...draft,doc:{...baseline,elements:[...baseline.elements,photo]}};
writeCanvasDraft(storage,scope,'site-a',imageDraft);assert.deepEqual(readCanvasDrafts(storage,scope,'site-a',now).find(d=>d.sectionId===null)?.doc.elements[1],photo);
photo.src='';writeCanvasDraft(storage,scope,'site-a',imageDraft);assert.ok(!PublishedCanvasSchema.safeParse(imageDraft.doc).success,'Incomplete image may be recovered but not applied');
for(const src of ['https://example.com/private.png','/free-editor/wheel.svg','/media/site-b/12345678-1234-1234-1234-123456789abc.webp']){
 photo.src=src;assert.throws(()=>writeCanvasDraft(storage,scope,'site-a',imageDraft));
 storage.setItem(canvasDraftKey(scope,null),JSON.stringify(imageDraft));assert.ok(!readCanvasDrafts(storage,scope,'site-a',now).some(d=>d.sectionId===null));
}
for(const raw of ['{','x'.repeat(800001),JSON.stringify({...draft,after:'99'}),JSON.stringify({...draft,format:2}),JSON.stringify({...draft,sectionId:'../x'}),JSON.stringify({...draft,secret:'reject'}),JSON.stringify({...draft,doc:{...changed,elements:[changed.elements[0],changed.elements[0]]}}),JSON.stringify({...draft,doc:{...changed,elements:[{...changed.elements[0],href:'javascript:alert(1)'}]}}),JSON.stringify({...draft,doc:{...changed,elements:[{...changed.elements[0],phone:{...changed.elements[0].phone,x:500}}]}})]){
 storage.setItem(canvasDraftKey(scope,null),raw);assert.ok(!readCanvasDrafts(storage,scope,'site-a',now).some(d=>d.sectionId===null));assert.equal(storage.getItem(canvasDraftKey(scope,null)),null);
}
writeCanvasDraft(storage,scope,'site-a',draft);assert.deepEqual(readCanvasDrafts(storage,scope,'site-a',now+CODE_DRAFT_TTL+1),[]);
writeCanvasDraft(storage,scope,'site-a',{...draft,savedAt:now+60001});assert.deepEqual(readCanvasDrafts(storage,scope,'site-a',now),[]);
assert.throws(()=>writeCanvasDraft({...storage,setItem:()=>{throw Error('QuotaExceeded');}},scope,'site-a',draft),/Quota/);
for(const locale of ['en','ru','es']){
 const props={draft:{...draft,doc:{...draft.doc,title:"<script>DEMO_ONLY()</script>"}},locale,siteId:'site-a',current:true,restorable:true,stale:false,exists:true,busy:false,restore:()=>{},discard:()=>{}};
 const html=renderToStaticMarkup(createElement(CanvasDraftNotice,props));assert.ok(!html.includes('<script>DEMO_ONLY()'));assert.match(html,/&lt;script&gt;/);assert.match(html,/inert=""/);assert.match(html,/download="windx-canvas-draft.json"/);
 const stale=renderToStaticMarkup(createElement(CanvasDraftNotice,{...props,restorable:false,stale:true}));assert.equal((html.match(/<button/g)||[]).length,(stale.match(/<button/g)||[]).length+1);
 const busy=renderToStaticMarkup(createElement(CanvasDraftNotice,{...props,busy:true}));assert.equal((busy.match(/disabled=""/g)||[]).length,2);
}
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
try{Object.defineProperty(globalThis,'window',{value:{localStorage:storage},configurable:true});writeCanvasDraft(storage,scope,'site-a',draft);storage.setItem('unrelated','keep');storage.setItem('windx:text-draft:v1:qa','keep');clearCanvasDrafts();assert.equal(storage.getItem(canvasDraftKey(scope,null)),null);assert.equal(storage.getItem('unrelated'),'keep');assert.equal(storage.getItem('windx:text-draft:v1:qa'),'keep');}
finally{if(descriptor)Object.defineProperty(globalThis,'window',descriptor);else Reflect.deleteProperty(globalThis,'window');}
console.log('PASS canvas drafts: scoped targets, complete independent layouts and image references, incomplete image recovery, undo/redo, unsafe/foreign images and links, corrupt/expired/oversized data, stale target gates, inert localized preview/download, storage errors and targeted cleanup');
