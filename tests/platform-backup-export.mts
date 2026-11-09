import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,symlink,unlink,rm} from 'node:fs/promises';
import {generateKeyPairSync} from 'node:crypto';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {scheduledBackup} from '../ops/platform-backup.mjs';
import {exportPlatformBackup} from '../ops/platform-backup-http.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'windx-backup-export-'));
try{
 await mkdir(path.join(root,'auth'));await mkdir(path.join(root,'sites'));
 const keys=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
 const publicFile=path.join(root,'platform-backups','public.pem');await mkdir(path.dirname(publicFile));await writeFile(publicFile,keys.publicKey);
 const info=await scheduledBackup({root,publicKey:publicFile,env:{RESEND_API_KEY:'synthetic-secret'}});
 const config={root,project:'project',environment:'production'};const token='a'.repeat(36);
 let calls=0;
 const verified:typeof fetch=async(url,options)=>{calls++;assert.equal(url,'https://backboard.railway.com/graphql/v2');assert.equal((options!.headers as Record<string,string>)['Project-Access-Token'],token);assert.equal(options!.redirect,'error');return Response.json({data:{projectToken:{projectId:config.project,environmentId:config.environment}}});};
 const req=(query='',auth=true)=>new Request('https://www.windx.app/internal/platform-backup'+query,{headers:auth?{authorization:'Bearer '+token}:{}});
 assert.equal((await exportPlatformBackup(req('',false),config,verified)).status,401);assert.equal(calls,0);
 for(const query of ['?file=../../configuration.json','?file=%2fetc%2fpasswd','?file=x&file=y','?token=not-in-url'])assert.equal((await exportPlatformBackup(req(query),config,verified)).status,400);
 assert.equal(calls,0);
 assert.equal((await exportPlatformBackup(new Request('https://www.windx.app/internal/platform-backup',{method:'POST'}),config,verified)).status,405);
 const wrongProject:typeof fetch=async()=>Response.json({data:{projectToken:{projectId:'foreign',environmentId:'production'}}});
 const wrongEnvironment:typeof fetch=async()=>Response.json({data:{projectToken:{projectId:'project',environmentId:'staging'}}});
 for(const provider of [wrongProject,wrongEnvironment,async()=>Response.json({errors:[{message:'synthetic-secret'}]})]){
  const response=await exportPlatformBackup(req(),config,provider);assert.equal(response.status,403);assert.equal((await response.text()).includes('synthetic-secret'),false);
 }
 assert.equal((await exportPlatformBackup(req(),config,async()=>new Response('',{status:503}))).status,503);
 assert.equal((await exportPlatformBackup(req(),config,async()=>{throw Error('network');})).status,503);
 await writeFile(path.join(root,'platform-backups/latest.json'),JSON.stringify({...info,config:{RESEND_API_KEY:'synthetic-secret'}}));
 const response=await exportPlatformBackup(req(),config,verified);assert.equal(response.status,200);assert.match(response.headers.get('cache-control')!,/private.*no-store/);assert.equal(response.headers.get('vary'),'Authorization');
 const text=await response.text();assert.ok(!text.includes('synthetic-secret'));assert.equal(JSON.parse(text).file,info.file);
 const binary=await exportPlatformBackup(req('?file='+info.file),config,verified);assert.equal(binary.status,200);assert.equal(binary.headers.get('content-type'),'application/octet-stream');
 assert.deepEqual(Buffer.from(await binary.arrayBuffer()),await readFile(path.join(root,'platform-backups',info.file)));
 await unlink(path.join(root,'platform-backups',info.file));await symlink(publicFile,path.join(root,'platform-backups',info.file));
 assert.equal((await exportPlatformBackup(req('?file='+info.file),config,verified)).status,503);
 await writeFile(path.join(root,'platform-backups/latest.json'),JSON.stringify({...info,createdAt:new Date(Date.now()-31*3600_000).toISOString()}));
 assert.equal((await exportPlatformBackup(req(),config,verified)).status,503);
 let limited=false;for(let i=0;i<65;i++)if((await exportPlatformBackup(req(),config,verified)).status===429)limited=true;
 assert.ok(limited);
 const protectedDir=path.join(root,'existing-download');await mkdir(protectedDir);await writeFile(path.join(protectedDir,'keep'),'owner data');
 const guarded=spawnSync(process.execPath,['ops/download-platform-backup.mjs',protectedDir],{env:{...process.env,RAILWAY_TOKEN:token},encoding:'utf8'});assert.equal(guarded.status,1);assert.equal(await readFile(path.join(protectedDir,'keep'),'utf8'),'owner data');
 console.log('PASS encrypted-only export: active project/environment scope required, no token in URL, no-store, metadata redaction, bounded encrypted file, no traversal/symlinks, provider outage/stale snapshot refused, rate limiting.');
}finally{await rm(root,{recursive:true,force:true});}
