import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {TEMPLATE_BRIEFS} from '../src/lib/templates';
import {SHOWCASE} from '../src/lib/showcase';
const root=await mkdtemp(path.join(os.tmpdir(),'windx-examples-')),port=3253,base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{env:{...process.env,WINDX_DATA_DIR:root,NODE_ENV:'production',AI_DEMO:'1',WINDX_MAIL_PROVIDER:'disabled'},stdio:'pipe'});
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/login')).ok)break;}catch{}if(server.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
 for(const locale of ['en','ru','es']){
  const headers={cookie:`windx_lang=${locale}`};const catalog=await fetch(base+'/templates',{headers,redirect:'manual'});assert.equal(catalog.status,200);const html=await catalog.text();assert.ok(!catalog.headers.has('location'));
  const image=html.match(/<img[^>]*\ssrc="([^"]+)"/)?.[1];assert.ok(image,'Catalogue has real previews');const ir=await fetch(base+image.replaceAll('&amp;','&'));assert.equal(ir.status,200,'Versioned catalogue image must be allowed by Next image configuration');assert.match(ir.headers.get('content-type')??'',/^image\//);
  for(const style of SHOWCASE){assert.ok(html.includes(`/examples/${style}`));const r=await fetch(base+`/examples/${style}`,{headers,redirect:'manual'});assert.equal(r.status,200);const example=await r.text();assert.ok(example.includes('windx-example-banner'));assert.ok(example.includes(`/?style=${style}#create`));assert.ok(!r.headers.has('set-cookie'),'Viewing samples does not create an account or guest session');assert.ok(!r.headers.has('location'));assert.match(r.headers.get('content-security-policy')??'',/form-action 'none'/);assert.ok(!example.includes('data-windx-enquiry'));}
 }
 for(let i=0;i<TEMPLATE_BRIEFS.length;i++){const r=await fetch(base+'/templates/'+i);assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes('windx-example-banner'));assert.ok(html.includes('/?t='+i+'&amp;style='));assert.equal(r.headers.has('set-cookie'),false);}
 assert.equal((await fetch(base+'/templates/12')).status,404);
 assert.equal((await fetch(base+'/examples/not-a-style')).status,404);
 assert.equal((await fetch(base+'/preview/4751de5d/5')).status,404,'Private preview was not made public');
 const chosen=await(await fetch(base+'/?style=night-shift')).text();assert.match(chosen,/name="style" value="night-shift"/);
 console.log('PASS anonymous catalog and all 11 styles and 12 trade examples EN/RU/ES, chosen style reaches creation, no guest quota/account/session for preview, disabled forms and private preview still closed.');
}catch(error){console.error(logs.slice(-1000));throw error;}finally{server.kill('SIGTERM');if(server.exitCode===null)await new Promise<void>(r=>server.once('exit',()=>r()));await rm(root,{recursive:true,force:true});}
