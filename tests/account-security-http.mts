import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm,readdir,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import os from 'node:os';
import {chromium} from 'playwright';
import {registerAccount,createSession,sessionIdentity,authenticate,accountSummary} from '../src/lib/auth/accounts';
import {authFile,readJson,replaceJson} from '../src/lib/auth/account-store';
import {FileSiteStore} from '../src/lib/storage/file-store';
const root=await mkdtemp(path.join(os.tmpdir(),'windx-security-http-'));
process.env.WINDX_DATA_DIR=root;
const port=3216,base=`http://127.0.0.1:${port}`,old='init-123',next='next-123',raw=new FileSiteStore(root);
const owner=await registerAccount('reset@example.test',old),verify=await registerAccount('verify@example.test',old),foreign=await registerAccount('foreign@example.test',old);
const session=await createSession(owner),second=await createSession(owner),verifier=await createSession(verify),stranger=await createSession(foreign);
const now=new Date().toISOString();await raw.saveSite({id:'same-owner',ownerId:owner.id,name:'Retained ownership',brief:'private',facts:{},currentVersion:1,versionCount:1,createdAt:now,updatedAt:now});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,AI_DEMO:'1',NODE_ENV:'production',WINDX_AUTH_ORIGIN:base,WINDX_MAIL_PROVIDER:'file',WINDX_MAIL_TEST:'1'},stdio:'pipe'});
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
const cookie=(s:string): Record<string,string> =>s?{cookie:`__Host-windx_session=${s}`} : {};
async function outbox(email:string,part:string) {
 for(let i=0;i<100;i++) {
  const files=await readdir(path.join(root,'auth','test-outbox')).catch(()=>[]);
  for(const file of files){const mail=JSON.parse(await readFile(path.join(root,'auth','test-outbox',file),'utf8'));if(mail.to===email&&mail.text.includes(part))return mail as {text:string;html:string;subject:string};}
  await new Promise(r=>setTimeout(r,50));
 }
 throw Error('Expected test message was not queued');
}
const tokenOf=(text:string)=>new URL(text.match(/http[^\s]+/)![0]).hash.slice(7);
try {
 for(let i=0;i<100;i++){try{if((await fetch(base+'/login')).status===200)break;}catch{}if(server.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
 const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8'));
 const actions=Object.entries(manifest.node) as [string,{exportedName:string}][];
 const {encodeReply}=createRequire(import.meta.url)('next/dist/compiled/react-server-dom-turbopack/client.node') as {encodeReply:(args:unknown[])=>Promise<string|FormData>};
 async function call(name:string,form:FormData,token='',page='/forgot-password') {
  const id=actions.find(([,a])=>a.exportedName===name)?.[0];assert.ok(id,name);
  const body=await encodeReply(['idle',form]);const response=await fetch(base+page,{method:'POST',headers:{'Next-Action':id,origin:base,...cookie(token),...(typeof body==='string'?{'content-type':'text/plain;charset=UTF-8'}:{})},body,redirect:'manual'});
  const text=await response.text();const result=[...text.matchAll(/(?:^|\n)[a-f0-9]+:"(requested|rate|done|invalid|wrongAccount|signIn|passwordShort|passwordLong|mismatch|failed|unavailable|invalidEmail)"/g)].at(-1)?.[1];assert.ok(result,text.slice(-1500));return{result,text,response};
 }
 const form=(values:Record<string,string>)=>{const f=new FormData();for(const [k,v]of Object.entries(values))f.set(k,v);return f;};
 for(const route of ['/forgot-password','/reset-password','/verify-email']){const r=await fetch(base+route);assert.equal(r.status,200);assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.match(r.headers.get('cache-control')??'',/no-store/);assert.equal(r.headers.get('x-frame-options'),'DENY');}
 assert.equal((await call('requestResetAction',form({email:'unknown@example.test'}))).result,'requested');
 assert.equal((await call('requestResetAction',form({email:owner.email}))).result,'requested');
 assert.equal((await call('requestResetAction',form({email:owner.email}))).result,'rate');
 const resetMail=await outbox(owner.email,'/reset-password#');const reset=tokenOf(resetMail.text);assert.equal(reset.length,64);
 const messages=await Promise.all((await readdir(path.join(root,'auth','test-outbox'))).map(async file=>JSON.parse(await readFile(path.join(root,'auth','test-outbox',file),'utf8'))));assert.ok(messages.every(mail=>mail.to!=='unknown@example.test'));
 assert.equal((await call('requestVerificationAction',new FormData(),stranger,'/account')).result,'requested');
 // Получатель берётся из сессии, подставленный email другого владельца игнорируется.
 assert.equal((await call('requestVerificationAction',form({email:owner.email}),verifier,'/account')).result,'requested');
 const verifyMail=await outbox(verify.email,'/verify-email#'),proof=tokenOf(verifyMail.text);
 assert.equal((await call('verifyEmailAction',form({token:proof}),'','/verify-email')).result,'signIn');
 assert.equal((await call('verifyEmailAction',form({token:proof}),stranger,'/verify-email')).result,'wrongAccount');
 assert.equal((await accountSummary(verify)).verified,false);
 assert.equal((await call('verifyEmailAction',form({token:proof}),verifier,'/verify-email')).result,'done');
 assert.equal((await call('verifyEmailAction',form({token:proof}),verifier,'/verify-email')).result,'invalid');
 assert.equal((await accountSummary(verify)).verified,true);assert.ok(await sessionIdentity(verifier));
 await fetch(base+'/reset-password');assert.ok(await readJson(authFile('security-tokens',reset)));
 assert.equal((await call('resetPasswordAction',form({token:reset,password:'short',confirm:'short'}),'','/reset-password')).result,'passwordShort');
 assert.equal((await call('resetPasswordAction',form({token:reset,password:'x'.repeat(129),confirm:'x'.repeat(129)}),'','/reset-password')).result,'passwordLong');
 assert.ok(await readJson(authFile('security-tokens',reset)), 'Validation must not consume the reset link');
 assert.equal((await call('resetPasswordAction',form({token:reset,password:next,confirm:next}),session,'/reset-password')).result,'done');
 assert.equal(await sessionIdentity(session),null);assert.equal(await sessionIdentity(second),null);assert.ok(await sessionIdentity(stranger));
 assert.equal(await authenticate(owner.email,old),null);assert.equal((await authenticate(owner.email,next))?.id,owner.id);assert.equal((await raw.getSite('same-owner'))?.ownerId,owner.id);
 assert.equal((await call('resetPasswordAction',form({token:reset,password:next,confirm:next}),'','/reset-password')).result,'invalid');
 await outbox(owner.email,'previous sessions');
 browser=await chromium.launch();const context=await browser.newContext({locale:'ru-RU',viewport:{width:1200,height:900}});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/login?mode=register');await page.getByLabel('Email',{exact:true}).fill('browser@example.test');await page.getByLabel('Password',{exact:true}).fill(old);await page.getByRole('button',{name:'Create account',exact:true}).click();
 await page.waitForURL(base+'/sites');const person=(await authenticate('browser@example.test',old))!;assert.ok(person);
 const confirmation=await outbox(person.email,'/verify-email#');const confirmURL=confirmation.text.match(/http[^\s]+/)![0];await page.goto(confirmURL);
 await page.waitForFunction(()=>location.hash==='');assert.equal((await accountSummary(person)).verified,false);
 await page.getByRole('button',{name:'Confirm email',exact:true}).click();await page.getByText('The email address is confirmed.',{exact:false}).waitFor();
 await page.getByRole('link',{name:'Open account',exact:true}).click();await page.getByRole('heading',{name:'Email confirmed',exact:true}).waitFor();
 const limit=authFile('mail-limits',`email:${(await import('../src/lib/auth/account-store')).digest(person.email)}`);const record=await readJson<Record<string,unknown>>(limit);await replaceJson(limit,{...record,last:Date.now()-61_000});
 await page.goto(base+'/forgot-password');await page.getByRole('button',{name:'Send reset instructions',exact:true}).click();await page.getByRole('alert').filter({hasText:'Enter a valid email address.'}).waitFor();
 await page.getByLabel('Email',{exact:true}).fill(person.email);await page.getByRole('button',{name:'Send reset instructions',exact:true}).click();await page.getByText('Request accepted.',{exact:false}).waitFor();
 const recovery=await outbox(person.email,'/reset-password#');await page.goto(recovery.text.match(/http[^\s]+/)![0]);await page.waitForFunction(()=>location.hash==='');
 await page.getByLabel('New password',{exact:true}).fill('short12');await page.getByLabel('Repeat new password',{exact:true}).fill('short12');await page.getByRole('button',{name:'Save new password',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Password is too short: 7 characters entered, at least 8 required.'}).waitFor();
 assert.equal(await page.getByLabel('New password',{exact:true}).getAttribute('aria-invalid'),'true');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('name')),'password');
 await page.getByLabel('New password',{exact:true}).fill(next);await page.getByLabel('Repeat new password',{exact:true}).fill('different-password');await page.getByRole('button',{name:'Save new password',exact:true}).click();await page.getByText('The passwords must match',{exact:false}).waitFor();
 await page.getByLabel('Repeat new password',{exact:true}).fill(next);await page.getByRole('button',{name:'Save new password',exact:true}).click();await page.getByText('Your password has changed.',{exact:false}).waitFor();
 await page.getByRole('link',{name:'Back to sign in',exact:true}).click();await page.getByLabel('Email',{exact:true}).fill(person.email);await page.getByLabel('Password',{exact:true}).fill(next);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(base+'/sites');
 await mkdir('data/verification',{recursive:true});await page.goto(base+'/account');await page.getByRole('heading',{name:'Email confirmed',exact:true}).waitFor();await page.screenshot({path:'data/verification/account-security-2026-11-01.png'});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
 assert.deepEqual(errors,[]);assert.ok(!logs.includes(reset)&&!logs.includes(proof));
 console.log('PASS: production actions and browser registration -> emailed fragment -> explicit matching-account confirmation -> reset/mismatch -> new-password login; generic unknown account, owner-only recipient, old sessions revoked, site retained, no GET consumption/cache/referrer/token logging, localization and mobile width; local outbox only, no real email');
} catch(e){console.error(logs.slice(-1800));throw e;} finally {await browser?.close();server.kill('SIGTERM');if(server.exitCode===null)await new Promise<void>(r=>server.once('exit',()=>r()));await rm(root,{recursive:true,force:true});}
