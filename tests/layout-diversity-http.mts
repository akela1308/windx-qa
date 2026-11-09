// Одноразовый локальный production-сервер; без внешнего AI и писем.
import './layout-diversity.mts';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {FileSiteStore} from '../src/lib/storage/file-store';
import {createSession} from '../src/lib/auth/accounts';
import type {Site} from '../src/lib/storage/types';
const root=await mkdtemp(path.join(os.tmpdir(),'windx-layout-http-'));process.env.WINDX_DATA_DIR=root;
const raw=new FileSiteStore(root),now=new Date().toISOString(),port=3258,base=`http://127.0.0.1:${port}`;
const owner=await createSession({id:'layout-owner',email:'layout@example.test'}),foreign=await createSession({id:'stranger',email:'stranger@example.test'});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{env:{...process.env,NODE_ENV:'production',AI_DEMO:'1',WINDX_MAIL_PROVIDER:'disabled'},stdio:'pipe'});let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/login')).ok)break;}catch{}if(server.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
 const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8')),actions=Object.entries(manifest.node) as [string,{exportedName:string}][];
 const {encodeReply}=createRequire(import.meta.url)('next/dist/compiled/react-server-dom-turbopack/client.node') as {encodeReply:(args:unknown[])=>Promise<string|FormData>};
 async function action(site:string,name:string,args:unknown[],token=owner){const id=actions.find(([,a])=>a.exportedName===name)?.[0];assert.ok(id,name);const body=await encodeReply(args);const r=await fetch(`${base}/sites/${site}`,{method:'POST',headers:{'Next-Action':id,origin:base,cookie:`__Host-windx_session=${token}`,...(typeof body==='string'?{'content-type':'text/plain;charset=UTF-8'}:{})},body,redirect:'manual'});assert.ok(r.status<500,`${name}: ${r.status}`);await r.text();}
 const form=(values:Record<string,string>)=>{const f=new FormData();for(const[k,v]of Object.entries(values))f.set(k,v);return f;};
 for(const name of ['split','desk','stage']){
  const doc=JSON.parse(await readFile(`data/verification/layout-diversity-2026-11-04/fixtures/${name}.json`,'utf8'));
  const site:Site={id:`layout-${name}`,ownerId:'layout-owner',name:doc.meta.businessName,brief:'Synthetic local layout test',facts:{},currentVersion:1,versionCount:1,createdAt:now,updatedAt:now,published:{slug:`layout-${name}`,version:1,at:now}};
  await raw.saveSite(site);await raw.addVersion(site.id,{n:1,createdAt:now,action:'create',request:'local',reply:'local',doc,demo:true,usage:{inputTokens:0,outputTokens:0,costUsd:0,estimated:false}});
  const live=`${base}/live/${site.id}`;
  const html=await(await fetch(live)).text();assert.ok(html.includes(`data-section="${doc.sections[1].composition}"`));assert.ok(html.includes(doc.sections[1].props.headline));
  assert.equal((await fetch(`${base}/preview/${site.id}/1`)).status,404);
  const preview=await fetch(`${base}/preview/${site.id}/1`,{headers:{cookie:`__Host-windx_session=${owner}`}});assert.equal(preview.status,200);
  const changes=form({intent:'prepare',section:'1',baseVersion:'1',changes:JSON.stringify([{path:'headline',value:'Manually improved layout'}])});
  await action(site.id,'contentAction',[site.id,{status:'idle'},changes],foreign);assert.equal(await raw.getPendingEdit(site.id),null);
  await action(site.id,'contentAction',[site.id,{status:'idle'},changes]);const pending=await raw.getPendingEdit(site.id);assert.ok(pending,name);
  await action(site.id,'contentAction',[site.id,{status:'idle'},form({decision:'apply',editId:pending.id})]);assert.equal((await raw.getSite(site.id))?.currentVersion,2);
  assert.ok(!(await(await fetch(live)).text()).includes('Manually improved layout'),'Draft edit does not change live v1');
  await action(site.id,'publishAction',[site.id]);assert.equal((await raw.getSite(site.id))?.published?.version,2);
  const updated=await(await fetch(live)).text();assert.ok(updated.includes('Manually improved layout'));assert.ok(updated.includes(`data-section="${doc.sections[1].composition}"`));
  assert.deepEqual((await raw.getVersion(site.id,1))?.doc,doc,'Original version retained');
 }
 console.log('PASS: new layouts survive private preview, manual proposal/apply, version history and republishing through production actions; foreign owner denied and draft/live separation retained. Local data only.');
}finally{server.kill('SIGTERM');if(server.exitCode===null)await new Promise<void>(r=>server.once('exit',()=>r()));await rm(root,{recursive:true,force:true});}
