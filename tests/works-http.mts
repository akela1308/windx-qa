import assert from 'node:assert/strict';import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
import {FileSiteStore} from '../src/lib/storage/file-store';import {createSession} from '../src/lib/auth/accounts';import {worksFingerprint} from '../src/lib/checks/analyse';import type {Site,SiteVersion} from '../src/lib/storage/types';import type {BrowserScan} from '../src/lib/checks/types';
const root=await mkdtemp(path.join(os.tmpdir(),'windx-works-http-'));process.env.WINDX_DATA_DIR=root;
const port=3199,base=`http://127.0.0.1:${port}`,raw=new FileSiteStore(root),now=new Date().toISOString();
const doc=JSON.parse(await readFile('docs/experiment-1c/outputs/bike/light.json','utf8'));doc.factsToConfirm=[{fact:'CONFIDENTIAL_CHECK_FACT',where:'contact'}];
const site:Site={id:'check-one',ownerId:'owner',name:'Checks',brief:'PRIVATE_BRIEF',facts:{},createdAt:now,updatedAt:now,currentVersion:1,versionCount:1};
const version:SiteVersion={n:1,createdAt:now,action:'create',request:'private',reply:'private',doc,demo:true,usage:{inputTokens:0,outputTokens:0,costUsd:0,estimated:false}};
await raw.saveSite(site);await raw.addVersion(site.id,version);
const owner=await createSession({id:'owner',email:'owner@example.test'}),foreign=await createSession({id:'foreign',email:'foreign@example.test'});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,AI_DEMO:'1',NODE_ENV:'production'},stdio:'pipe'});let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
try {
 for(let i=0;i<100;i++){try{if((await fetch(base+'/login')).status===200)break;}catch{}if(server.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
 const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8'));const actions=Object.entries(manifest.node) as [string,{exportedName:string}][];
 const {encodeReply}=createRequire(import.meta.url)('next/dist/compiled/react-server-dom-turbopack/client.node') as {encodeReply:(args:unknown[])=>Promise<string|FormData>};
 async function call(name:string,args:unknown[],token=owner){const id=actions.find(([,a])=>a.exportedName===name)?.[0];assert.ok(id,name);const body=await encodeReply(args);const r=await fetch(base+'/sites/check-one',{method:'POST',headers:{'Next-Action':id,origin:base,...(token?{cookie:`__Host-windx_session=${token}`} : {}),...(typeof body==='string'?{'content-type':'text/plain;charset=UTF-8'}:{})},body,redirect:'manual'});const text=await r.text();const values=text.split('\n').flatMap(line=>{try{return [JSON.parse(line.slice(line.indexOf(':')+1))];}catch{return [];}});return values.find(v=>v&&typeof v.ok==='boolean') as {ok:boolean;stale?:boolean;fingerprint?:string};}
 for(const token of ['',foreign])assert.equal((await call('startWorksAction',[site.id],token))?.ok,false);
 const start=await call('startWorksAction',[site.id]);assert.equal(start.ok,true);assert.equal(start.fingerprint,worksFingerprint(site,version));
 const scan:BrowserScan={width:1200,headings:[],links:[],duplicateIds:[],missingAlt:[],overflow:[],smallTargets:[],contrasts:[],fontsReady:true,truncated:false};
 assert.equal((await call('finishWorksAction',[site.id,start.fingerprint,[scan,{...scan,width:390}]],foreign)).ok,false);assert.equal((await raw.listWorksReports(site.id)).length,0);
 assert.equal((await call('finishWorksAction',[site.id,start.fingerprint,[{...scan,width:10}]],owner)).ok,false);
 await raw.saveSite({...site,facts:{CONFIDENTIAL_CHECK_FACT:'confirmed'}});
 assert.equal((await call('finishWorksAction',[site.id,start.fingerprint,[]])).stale,true);assert.equal((await raw.listWorksReports(site.id)).length,0);
 const fresh=await call('startWorksAction',[site.id]);assert.equal((await call('finishWorksAction',[site.id,fresh.fingerprint,[scan,{...scan,width:390}]])).ok,true);
 const reports=await raw.listWorksReports(site.id);assert.equal(reports.length,1);assert.equal(reports[0].browser,true);
 assert.equal((await raw.listEnquiries(site.id)).length,0);assert.equal((await raw.getSite(site.id))?.currentVersion,1);assert.deepEqual((await raw.getVersion(site.id,1))?.doc,doc);
 assert.equal(await raw.getPendingEdit(site.id),null);
 for(const token of ['',foreign]){const r=await fetch(base+'/sites/check-one',{headers:token?{cookie:`__Host-windx_session=${token}`}:{}});assert.ok(!(await r.text()).includes(reports[0].id));}
 const own=await fetch(base+'/sites/check-one',{headers:{cookie:`__Host-windx_session=${owner}`}});assert.match(own.headers.get('cache-control')??'',/private/);assert.ok((await own.text()).includes(reports[0].id));
 assert.equal((await call('finishWorksAction',[site.id,fresh.fingerprint,[]])).ok,true);assert.equal((await raw.listWorksReports(site.id))[0].browser,false);
 console.log('PASS: production actions, owner/foreign/anonymous isolation, bounded scans, stale-run rejection, private persisted history, partial report, no site/version/pending changes and no test enquiries');
} catch(e){console.error(logs.slice(-1500));throw e;} finally {server.kill('SIGTERM');await new Promise<void>(r=>server.once('exit',()=>r()));await rm(root,{recursive:true,force:true});}
