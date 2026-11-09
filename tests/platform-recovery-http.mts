// Runs only an isolated restored tree. No production cookies, passwords or API calls.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {generateKeyPairSync} from 'node:crypto';
import {spawn} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {createBackup,restoreBackup} from '../ops/platform-backup.mjs';
import {registerAccount,createSession,authenticate,sessionIdentity,type Account} from '../src/lib/auth/accounts';
import {FileSiteStore} from '../src/lib/storage/file-store';
import {saveImage} from '../src/lib/media/files';
import {mediaRefs} from '../src/lib/media/refs';
let work='',oldToken='',restored=process.env.WINDX_RECOVERY_DRILL??'';
if(!restored){
 work=await mkdtemp(path.join(os.tmpdir(),'windx-recovery-http-'));
 const source=path.join(work,'source');await mkdir(source);process.env.WINDX_DATA_DIR=source;
 const owner=await registerAccount('recovery-owner@example.test','recovery-local-2026');await registerAccount('recovery-other@example.test','recovery-local-2026');oldToken=await createSession(owner);
 const store=new FileSiteStore(source),at=new Date().toISOString();
 const doc=JSON.parse(await readFile('docs/experiment-1c/outputs/bike/light.json','utf8'));doc.factsToConfirm=[];
 const site={id:'recovery-fixture',ownerId:owner.id,name:'Recovery fixture',brief:'Technical fixture',facts:{},currentVersion:1,versionCount:1,createdAt:at,updatedAt:at,published:{slug:'recovery-fixture',version:1,at}};
 await store.saveSite(site);
 const src=await saveImage(site.id,await sharp({create:{width:16,height:16,channels:3,background:'#25d366'}}).png().toBuffer());
 doc.sections.push({id:'image',composition:'media.image',tone:'default',props:{photo:{src,subject:'Recovery fixture image'}}});
 await store.addVersion(site.id,{n:1,createdAt:at,action:'create',request:'Fixture',reply:'Fixture',doc,usage:{inputTokens:0,outputTokens:0,costUsd:0,estimated:false},demo:true});
 const keys=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{format:'pem',type:'spki'},privateKeyEncoding:{format:'pem',type:'pkcs8'}});
 const key=path.join(work,'private.pem');await writeFile(key,keys.privateKey,{mode:0o600});const archive=path.join(work,'snapshot.windx.enc');
 await createBackup({root:source,output:archive,publicKey:keys.publicKey});const dest=path.join(work,'restored');await restoreBackup({archive,privateKey:key,destination:dest});restored=path.join(dest,'data');
}
restored=path.resolve(restored);
assert.notEqual(restored,'/data');assert.ok(!restored.startsWith('/app/'));
const summary=JSON.parse(await readFile(path.join(restored,'../restore-summary.json'),'utf8'));assert.equal(summary.sessionsAndOneTimeLinksRemoved,true);
process.env.WINDX_DATA_DIR=restored;
assert.deepEqual(await readdir(path.join(restored,'auth/sessions')).catch(()=>[]),[]);
if(oldToken){assert.equal(await sessionIdentity(oldToken),null);assert.ok(await authenticate('recovery-owner@example.test','recovery-local-2026'));}
const users:Account[]=[];for(const file of await readdir(path.join(restored,'auth/users')))users.push(JSON.parse(await readFile(path.join(restored,'auth/users',file),'utf8')));
const store=new FileSiteStore(restored),sites=await store.listSites();
assert.equal(users.length,summary.contents.accounts);assert.equal(sites.length,summary.contents.sites);
const site=sites.find(s=>users.some(u=>u.id===s.ownerId));assert.ok(site);
const owner=users.find(u=>u.id===site.ownerId)!,other=users.find(u=>u.id!==owner.id);assert.ok(other);
const tokens=new Map<string,string>();for(const user of users)tokens.set(user.id,await createSession(user));
const token=tokens.get(owner.id)!,foreign=tokens.get(other.id)!;
const port=3248,base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{env:{...process.env,NODE_ENV:'production',WINDX_DATA_DIR:restored,WINDX_AUTH_ORIGIN:base,AI_DEMO:'1',WINDX_MAIL_PROVIDER:'disabled',RESEND_API_KEY:'',OPENROUTER_API_KEY:'',GOOGLE_CLIENT_SECRET:'',WINDX_DOMAIN_RAILWAY_TOKEN:'',WINDX_SEARCH_HTTP:'0'},stdio:'pipe'});
const exited=new Promise(resolve=>server.once('exit',resolve));
let logs='';server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
const get=(p:string,t='')=>fetch(base+p,{headers:t?{cookie:`__Host-windx_session=${t}`}:{},redirect:'manual'});
try{
 for(let i=0;i<100;i++){try{if((await get('/login')).ok)break;}catch{}if(server.exitCode!==null)throw Error('Recovery server stopped');await new Promise(r=>setTimeout(r,100));}
 assert.equal((await get(`/sites/${site.id}`,token)).status,200);
 assert.equal((await get(`/preview/${site.id}/${site.currentVersion}`,token)).status,200);
 assert.equal((await get(`/preview/${site.id}/${site.currentVersion}`,foreign)).status,404);
 assert.equal((await get(`/preview/${site.id}/${site.currentVersion}`)).status,404);
 let published=0,images=0,ownedSites=0;
 for(const s of sites){
  if(s.published){const r=await get(`/live/${s.published.slug}`);assert.equal(r.status,200,'Restored publication must render');assert.match(await r.text(),/<html/);published++;}
  const access=s.ownerId?tokens.get(s.ownerId):undefined;
  if(access){
   assert.equal((await get(`/sites/${s.id}`,access)).status,200);ownedSites++;
   const versions=await store.listVersions(s.id);
   for(const src of new Set(versions.flatMap(v=>mediaRefs(v.doc)))){const r=await get(src,access);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/webp');assert.ok((await r.arrayBuffer()).byteLength>0);images++;}
   assert.equal((await get(`/sites/${s.id}/enquiries`,access)).status,200);
  }
 }
 assert.ok(!/platform backup ready/.test(logs),'recovery must not start production backup worker');
 console.log(JSON.stringify({ok:true,accounts:users.length,sites:sites.length,versions:summary.contents.versions,enquiries:summary.contents.enquiries,publishedPagesRendered:published,ownerImagesServed:images,registeredOwnerSitesChecked:ownedSites,ownerEditor:true,foreignAndAnonymousDenied:true,oldSessionsRevoked:true,externalMailAiAndDomainCredentialsDisabled:true}));
}finally{
 server.kill('SIGTERM');await exited;
 await rm(path.join(restored,'auth/sessions'),{recursive:true,force:true});
 if(work)await rm(work,{recursive:true,force:true});
}
