import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {request as httpRequest} from 'node:http';
import {createRequire} from 'node:module';
import {FileSiteStore} from '../src/lib/storage/file-store';
import {createSession} from '../src/lib/auth/accounts';
import type {Site,SiteVersion} from '../src/lib/storage/types';
const root=await mkdtemp(path.join(os.tmpdir(),'windx-enquiry-http-'));
process.env.WINDX_DATA_DIR=root;
const port=3198,base=`http://127.0.0.1:${port}`,host=`forms.localhost:${port}`,origin=`https://${host}`;
const raw=new FileSiteStore(root),now=new Date().toISOString();
const fixture=JSON.parse(await readFile('docs/experiment-1c/outputs/bike/light.json','utf8'));
fixture.factsToConfirm=[];
const site:Site={id:'forms',ownerId:'owner',name:'Forms',brief:'private',facts:{},currentVersion:1,versionCount:1,createdAt:now,updatedAt:now,published:{slug:'forms',version:1,at:now},enquiryRecipient:{email:'PRIVATE_RECIPIENT@example.test',confirmedAt:now}};
const doc=structuredClone(fixture);
doc.sections.splice(doc.sections.length-1,0,...['contact.form','contact.form-inline'].map((composition,i)=>({id:`form-${i}`,composition,tone:'default',props:{title:`Enquiry ${i}`,submitLabel:'Send enquiry'}})));
await raw.saveSite(site);await raw.addVersion(site.id,{n:1,createdAt:now,action:'create',request:'private',reply:'private',doc,demo:true,usage:{inputTokens:0,outputTokens:0,costUsd:0,estimated:false}} as SiteVersion);await raw.prepareEnquiryInbox(site.id);
await raw.saveSite({...site,id:'manual',published:undefined,enquiryRecipient:undefined});
await raw.addVersion('manual',{...(await raw.getVersion(site.id,1))!,doc:fixture});
const owner=await createSession({id:'owner',email:'owner@example.test'}),foreign=await createSession({id:'foreign',email:'foreign@example.test'});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,AI_DEMO:'1',NODE_ENV:'production'},stdio:'pipe'});
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
function request(pathname:string,method='GET',body='',extra:Record<string,string>={}) {
  return new Promise<{status:number;body:string;headers:Record<string,unknown>}>((resolve,reject)=>{
    const req=httpRequest(base+pathname,{method,headers:{host,...(method==='POST'?{origin,'content-type':'application/x-www-form-urlencoded',accept:'application/json'}:{}),...extra}},res=>{let s='';res.on('data',d=>s+=d);res.on('end',()=>resolve({status:res.statusCode!,body:s,headers:res.headers}));});req.on('error',reject);req.end(body);
  });
}
try {
  for(let i=0;i<100;i++){try{if((await fetch(base+'/login')).status===200)break;}catch{}if(server.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
  const live=await request('/');assert.equal(live.status,200);assert.match(String(live.headers['cache-control']),/max-age=5/);
  assert.ok(!live.body.includes(site.enquiryRecipient!.email));assert.match(live.body,/action="\/_enquiry"/);
  const tokens=[...live.body.matchAll(/name="token" value="([^"]+)"/g)].map(m=>m[1]);assert.equal(tokens.length,2);
  const input=(index=0,overrides:Record<string,string>={})=>new URLSearchParams({token:tokens[index],submission:'test-one',name:'Visitor <script>x</script>',contact:'visitor@example.test',message:'PRIVATE_ENQUIRY_BODY',extra_reference:'',...overrides}).toString();
  for(const [overrides,headers,status] of [
    [{name:''},{},400],[{contact:'not-contact'},{},400],[{message:'x'.repeat(4001)},{},400],[{extra_reference:'bot'},{},400],[{token:tokens[0]+'x'},{},403],[{},{origin:'https://evil.example','x-windx-request-host':'evil.example'},403],
  ] as [Record<string,string>,Record<string,string>,number][]){const r=await request('/_enquiry','POST',input(0,overrides),headers);assert.equal(r.status,status,r.body);assert.equal(JSON.parse(r.body).ok,false);}
  assert.equal((await request('/_enquiry','POST','x'.repeat(66000))).status,413);
  assert.equal((await raw.listEnquiries(site.id)).length,0);
  const sent=await request('/_enquiry','POST',input());assert.equal(sent.status,200,sent.body);assert.equal(JSON.parse(sent.body).ok,true);assert.equal(sent.headers['cache-control'],'no-store');
  assert.equal((await request('/_enquiry','POST',input())).status,200);assert.equal((await raw.listEnquiries(site.id)).length,1);
  const compact=await request('/_enquiry','POST',input(1,{name:'',submission:'compact',contact:'+44 20 1234 5678',message:'Compact request'}),{accept:'text/html'});assert.equal(compact.status,200);assert.match(compact.body,/Enquiry received/);assert.equal((await raw.listEnquiries(site.id)).length,2);
  const inbox=await fetch(base+'/sites/forms/enquiries',{headers:{cookie:`__Host-windx_session=${owner}`}});const inboxHtml=await inbox.text();assert.match(inboxHtml,/PRIVATE_ENQUIRY_BODY/);assert.match(inboxHtml,/&lt;script&gt;/);assert.match(inbox.headers.get('cache-control')??'',/private/);
  for(const token of ['',foreign]){const body=await (await fetch(base+'/sites/forms/enquiries',{headers:token?{cookie:`__Host-windx_session=${token}`}:{}})).text();assert.ok(!body.includes('PRIVATE_ENQUIRY_BODY'));}
  const preview=await (await fetch(base+'/preview/forms/1',{headers:{cookie:`__Host-windx_session=${owner}`}})).text();assert.match(preview,/<fieldset disabled=""/);assert.ok(!preview.includes('fetch(f.action'));
  // Действия владельца через тот же RPC, который вызывает реальный интерфейс.
  const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8'));
  const actions=Object.entries(manifest.node) as [string,{exportedName:string}][];
  const {encodeReply}=createRequire(import.meta.url)('next/dist/compiled/react-server-dom-turbopack/client.node') as {encodeReply:(args:unknown[])=>Promise<string|FormData>};
  async function action(name:string,args:unknown[],token=owner){const id=actions.find(([,a])=>a.exportedName===name)?.[0];assert.ok(id,name);const body=await encodeReply(args);return fetch(base+'/sites/manual',{method:'POST',headers:{'Next-Action':id,origin:base,cookie:`__Host-windx_session=${token}`,...(typeof body==='string'?{'content-type':'text/plain;charset=UTF-8'}:{})},body,redirect:'manual'});}
  const form=new FormData();form.set('baseVersion','1');form.set('kind','full');
  await action('enquiryFormAction',['manual',{status:'idle'},form],foreign);assert.equal(await raw.getPendingEdit('manual'),null);
  await action('enquiryFormAction',['manual',{status:'idle'},form]);const proposal=await raw.getPendingEdit('manual');assert.equal(proposal?.version.action,'form');
  assert.equal(proposal?.version.usage.costUsd,0);assert.deepEqual(proposal?.version.doc.sections.filter(s=>!s.id?.startsWith('enquiry-')),fixture.sections);
  const apply=new FormData();apply.set('decision','apply');apply.set('editId',proposal!.id);await action('enquiryFormAction',['manual',{status:'idle'},apply]);
  assert.equal((await raw.getSite('manual'))?.currentVersion,2);
  await action('publishAction',['manual']);assert.equal((await raw.getSite('manual'))?.published,undefined);
  const recipient=new FormData();recipient.set('email','owner@example.test');await action('enquiryRecipientAction',['manual','',recipient],foreign);assert.equal((await raw.getSite('manual'))?.enquiryRecipient,undefined);
  await action('enquiryRecipientAction',['manual','',recipient]);await action('publishAction',['manual']);assert.ok((await raw.getSite('manual'))?.published);
  await action('duplicateAction',['forms']);const copy=(await raw.listSites()).find(s=>!['manual','forms'].includes(s.id));assert.ok(copy);assert.equal(copy.enquiryRecipient,undefined);assert.deepEqual(await raw.listEnquiries(copy.id),[]);
  const record=(await raw.listEnquiries(site.id)).find(e=>e.message==='PRIVATE_ENQUIRY_BODY')!;
  await action('deleteEnquiryAction',[site.id,record.id],foreign);assert.equal((await raw.listEnquiries(site.id)).length,2);
  await action('deleteEnquiryAction',[site.id,record.id]);assert.equal((await raw.listEnquiries(site.id)).length,1);
  // Offline и новая публикация отзывают уже выданный токен, без ожидания его TTL.
  await raw.saveSite({...site,published:undefined});assert.equal((await request('/')).status,404);assert.equal((await request('/')).headers['cache-control'],'no-store, max-age=0');
  assert.equal((await request('/_enquiry','POST',input())).status,404);
  await raw.saveSite({...site,published:{...site.published!,at:new Date(Date.now()+1000).toISOString()}});
  assert.equal((await request('/_enquiry','POST',input())).status,409);
  const renewed=await request('/');const fresh=[...renewed.body.matchAll(/name="token" value="([^"]+)"/g)][0][1];
  assert.equal((await request('/_enquiry','POST',input(0,{token:fresh,submission:'fresh'}))).status,200);
  let last=0;for(let i=0;i<5;i++)last=(await request('/_enquiry','POST',input(0,{token:fresh,submission:'rate-'+i}))).status;
  assert.equal(last,429);
  // Диск недоступен: не выдаём ложное успешное получение.
  await raw.saveSite({...site,id:'no-inbox',published:{slug:'no-inbox',version:1,at:now}});await raw.addVersion('no-inbox',(await raw.getVersion('forms',1))!);
  const broken=await request('/live/no-inbox','GET','',{host:`127.0.0.1:${port}`});const brokenToken=[...broken.body.matchAll(/name="token" value="([^"]+)"/g)][0][1];
  const fail=await request('/live/no-inbox/enquiry','POST',input(0,{token:brokenToken}),{host:`127.0.0.1:${port}`,origin:`https://127.0.0.1:${port}`});assert.equal(fail.status,503);assert.equal(JSON.parse(fail.body).ok,false);
  console.log('PASS: live subdomain POST, both forms, validation, honeypot, origin/body limits, deduplication, native fallback, private inbox, owner-only actions, manual preview/apply, recipient publication gate, copy isolation, deletion, offline/republication revocation, rate limiting and storage failure');
} catch(e){console.error(logs.slice(-3000));throw e;} finally {server.kill('SIGTERM');await new Promise<void>(r=>server.once('exit',()=>r()));await rm(root,{recursive:true,force:true});}
