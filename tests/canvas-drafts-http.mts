// Изолированный HTTP-сценарий, без браузера, внешних писем и AI.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {FileSiteStore} from '../src/lib/storage/file-store';
import {createSession} from '../src/lib/auth/accounts';
import {blankCanvas} from '../src/lib/free-editor/blank';
import {canvasBlocks} from '../src/lib/free-editor/site-service';
import type {CanvasDoc} from '../src/lib/free-editor/model';
const root=await mkdtemp(path.join(os.tmpdir(),'windx-canvas-drafts-http-'));
process.env.WINDX_DATA_DIR=root;
const port=3251,base=`http://127.0.0.1:${port}`,store=new FileSiteStore(root),now=new Date().toISOString(),id='canvas-recovery';
const doc=JSON.parse(await readFile('docs/experiment-1c/outputs/yoga/light.json','utf8'));doc.factsToConfirm=[];
await store.saveSite({id,ownerId:'owner',name:'DEMO ONLY canvas recovery',brief:'Local synthetic fixture',facts:{},currentVersion:1,versionCount:1,createdAt:now,updatedAt:now,published:{slug:id,version:1,at:now}});
await store.addVersion(id,{n:1,createdAt:now,action:'create',request:'Synthetic fixture',reply:'Fixture',doc,demo:true,usage:{inputTokens:0,outputTokens:0,costUsd:0,estimated:false}});
const owner=await createSession({id:'owner',email:'owner@example.test'}),foreign=await createSession({id:'foreign',email:'foreign@example.test'}),guest=await createSession({id:'guest',email:'',guest:true});
const auth=(token=owner):Record<string,string>=>token?{cookie:`__Host-windx_session=${token}`} : {};
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{env:{...process.env,NODE_ENV:'production',AI_DEMO:'1',WINDX_MAIL_PROVIDER:'disabled'},stdio:'pipe'});
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/login')).ok)break;}catch{}if(server.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
 const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8'));
 const actions=Object.entries(manifest.node) as [string,{exportedName:string}][];
 const {encodeReply}=createRequire(import.meta.url)('next/dist/compiled/react-server-dom-turbopack/client.node');
 async function action(name:string,args:unknown[],token=owner,origin=base){
  const key=actions.find(([,a])=>a.exportedName===name)?.[0];assert.ok(key);
  const body=await encodeReply(args);
  const r=await fetch(base+`/sites/${id}/canvas`,{method:'POST',headers:{'Next-Action':key,origin,...auth(token),...(typeof body==='string'?{'content-type':'text/plain;charset=UTF-8'}:{})},body,redirect:'manual'});
  return {status:r.status,text:await r.text()};
 }
 function proposal(canvas:CanvasDoc,version=1,sectionId=''){const f=new FormData();for(const [k,v]of Object.entries({canvas:JSON.stringify(canvas),baseVersion:String(version),sectionId,after:'footer',intent:'save'}))f.set(k,v);return f;}
 const call=(canvas:CanvasDoc,version=1,section='',token=owner,origin=base)=>action('canvasAction',[id,{status:'idle'},proposal(canvas,version,section)],token,origin);
 const decide=async(decision:string)=>{const pending=await store.getPendingEdit(id);assert.ok(pending);const f=new FormData();f.set('decision',decision);f.set('editId',pending.id);return action('canvasAction',[id,{status:'idle'},f]);};
 const canvas=blankCanvas('DEMO ONLY recovered canvas','DEMO ONLY recovered text');canvas.elements[0].desktop.x=100;canvas.elements[0].desktop.width=900;canvas.elements[0].phone.x=32;canvas.elements[0].phone.width=300;
 for(const token of ['',foreign,guest]){const html=await(await fetch(base+`/sites/${id}/canvas`,{headers:auth(token)})).text();assert.ok(!html.includes('DEMO ONLY canvas recovery'));await call(canvas,1,'',token);assert.equal(await store.getPendingEdit(id),null);}
 await call(canvas,1,'',owner,'https://evil.example');assert.equal(await store.getPendingEdit(id),null);
 const bad=structuredClone(canvas);(bad.elements[0] as {href?:string}).href='javascript:alert(1)';await call(bad);assert.equal(await store.getPendingEdit(id),null);
 const imageBytes=await sharp({create:{width:60,height:40,channels:3,background:'#345678'}}).png().toBuffer();
 const upload=await fetch(base+`/sites/${id}/images`,{method:'POST',headers:{...auth(),'content-type':'image/png',origin:base},body:new Uint8Array(imageBytes)});assert.equal(upload.status,200);const {src}=await upload.json();
 canvas.elements.push({id:'image-1',name:'Owner image',type:'image',layer:1,desktop:{x:10,y:250,width:100,height:100},phone:{x:10,y:250,width:100,height:100},src,alt:'DEMO ONLY uploaded image',fit:'contain',radius:10});
 for(const source of ['',src.replace(id,'other-site'),src.replace(/[^/]+$/, '12345678-1234-1234-1234-123456789abc.webp')]){const missing=structuredClone(canvas);(missing.elements[1] as {src:string}).src=source;await call(missing);assert.equal(await store.getPendingEdit(id),null);}
 await call(canvas);assert.ok(await store.getPendingEdit(id));assert.equal((await store.getSite(id))?.currentVersion,1);
 await decide('discard');assert.equal(await store.getPendingEdit(id),null);
 await call(canvas);await decide('apply');assert.equal((await store.getSite(id))?.currentVersion,2);
 const saved=(await store.getVersion(id,2))!.doc,block=canvasBlocks(saved)[0];assert.ok(block);assert.deepEqual(block.canvas,canvas);
 assert.deepEqual(saved.sections.filter(s=>s.composition!=='free.canvas'),doc.sections);
 assert.equal((await fetch(base+src)).status,404);assert.ok(!(await(await fetch(base+`/live/${id}`)).text()).includes('DEMO ONLY recovered text'));
 const changed=structuredClone(canvas);if(changed.elements[0].type==='text')changed.elements[0].text='DEMO ONLY later canvas';
 await call(changed,1,block.id);assert.equal(await store.getPendingEdit(id),null);
 await call(changed,2,'missing-id');assert.equal(await store.getPendingEdit(id),null);
 await call(changed,2,block.id);await decide('apply');assert.equal((await store.getSite(id))?.currentVersion,3);
 await action('publishAction',[id]);assert.equal((await fetch(base+src)).status,200);assert.match(await(await fetch(base+`/live/${id}`)).text(),/DEMO ONLY later canvas/);
 await action('unpublishAction',[id]);assert.equal((await fetch(base+src)).status,404);
 console.log('PASS canvas HTTP: owner route/action isolation, Origin, dangerous/missing/foreign images and links, review/discard/apply, independent layouts and uploaded image, unchanged neighbours, stale version/section, separate publication and offline assets');
}catch(error){console.error(logs.slice(-1000));throw error;}finally{server.kill('SIGTERM');if(server.exitCode===null)await new Promise<void>(r=>server.once('exit',()=>r()));await rm(root,{recursive:true,force:true});}
