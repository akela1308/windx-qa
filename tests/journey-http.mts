// Сквозной путь через настоящие production HTTP/Server Actions на одноразовых данных.
// AI_DEMO и локальный ящик: нет платных запросов, внешних писем или изменений production.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {FileSiteStore} from '../src/lib/storage/file-store';
import {registerAccount,createSession,authenticate,accountSummary} from '../src/lib/auth/accounts';
import {codeBlocks} from '../src/lib/sites/code';
import {issueSecurityToken} from '../src/lib/auth/security-tokens';
import {requirementsFingerprint} from '../src/lib/requirements/analyse';
const root=await mkdtemp(path.join(os.tmpdir(),'windx-journey-http-'));
process.env.WINDX_DATA_DIR=root;
const port=3242,base=`http://127.0.0.1:${port}`,store=new FileSiteStore(root);
const stranger=await registerAccount('other-journey@example.test','other-local-2026');
const foreign=await createSession(stranger);
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{env:{...process.env,NODE_ENV:'production',AI_DEMO:'1',WINDX_AUTH_ORIGIN:base,WINDX_MAIL_PROVIDER:'file',WINDX_MAIL_TEST:'1'},stdio:'pipe'});
let logs='',cookie='',siteId='';
server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8'));
const actions=Object.entries(manifest.node) as [string,{exportedName:string}][];
const {encodeReply}=createRequire(import.meta.url)('next/dist/compiled/react-server-dom-turbopack/client.node');
const form=(values:Record<string,string>)=>{const f=new FormData();for(const [k,v]of Object.entries(values))f.set(k,v);return f;};
const auth=(token=cookie): Record<string,string> =>token?{cookie:`__Host-windx_session=${token}`} : {};
const get=(route:string,token=cookie)=>fetch(base+route,{headers:auth(token),redirect:'manual'});
async function call(name:string,args:unknown[],route=siteId?`/sites/${siteId}`:'/',token=cookie,locale='en') {
 const id=actions.find(([,a])=>a.exportedName===name)?.[0];assert.ok(id,name);
 const body=await encodeReply(args);
 const response=await fetch(base+route,{method:'POST',headers:{'Next-Action':id,origin:base,cookie:`${token?`__Host-windx_session=${token}; `:''}windx_lang=${locale}`,...(typeof body==='string'?{'content-type':'text/plain;charset=UTF-8'}:{})},body,redirect:'manual'});
 const set=response.headers.getSetCookie().find(s=>s.startsWith('__Host-windx_session='));
 if(set&&token===cookie)cookie=set.split(';')[0].slice('__Host-windx_session='.length);
 const text=await response.text();
 const data=text.split('\n').flatMap(line=>{try{return[JSON.parse(line.slice(line.indexOf(':')+1))];}catch{return[];}}).find(v=>v&&typeof v==='object'&&('status'in v||'clarify'in v||'ok'in v));
 return{response,text,data};
}
async function review(action:string,decision:string){const pending=await store.getPendingEdit(siteId);assert.ok(pending);return call(action,[siteId,{status:'idle'},form({decision,editId:pending.id})]);}
async function mailFor(email:string,part:string){for(let i=0;i<100;i++){for(const file of await readdir(path.join(root,'auth','test-outbox')).catch(()=>[])){const mail=JSON.parse(await readFile(path.join(root,'auth','test-outbox',file),'utf8'));if(mail.to===email&&mail.text.includes(part))return mail.text as string;}await new Promise(r=>setTimeout(r,50));}throw Error('Local test mail missing');}
try {
 for(let i=0;i<100;i++){try{if((await get('/login')).ok)break;}catch{}if(server.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
 // Язык формы и ошибки определяет язык интерфейса, а не присланный скрытый locale.
 for(const [locale,title,error]of [['en','Sign in to WINDX','Incorrect email or password.'],['ru','Вход в WINDX','Неверная почта или пароль.'],['es','Iniciar sesión en WINDX','Correo o contraseña incorrectos.']]){
  const html=await(await fetch(base+'/login',{headers:{cookie:`windx_lang=${locale}`}})).text();assert.ok(html.includes(title));
  const invalid=await call('loginAction',['',form({email:'missing@example.test',password:'invalid-local-password',locale:'en'})],'/login','',locale);assert.ok(invalid.text.includes(error));
 }
 const brief='A bicycle repair workshop in Hackney, London. We fix commuter bicycles, brakes and punctures. Demo business for a local test.';
 const created=await call('createSiteAction',[{clarify:false,brief:''},form({brief})]);
 siteId=(created.response.headers.get('x-action-redirect')??'').match(/\/sites\/([a-z0-9-]+)/)?.[1]??'';assert.ok(siteId,created.text);
 const guest=cookie;assert.ok((await store.getSite(siteId))?.ownerId?.startsWith('guest-'));
 assert.equal((await call('publishAction',[siteId])).data.status,'blocked');
 await call('factsBulkAction',[siteId,Object.keys((await store.getSite(siteId))!.facts),'confirmed']);
 assert.equal((await call('publishAction',[siteId])).data.status,'live');
 const published=(await store.getSite(siteId))!.published!;const original=await(await get('/live/'+published.slug,'')).text();assert.ok(original.includes('<h1'));
 assert.equal((await call('editSiteAction',[siteId,{status:'idle'},form({request:'Make the hero calmer'})])).data.status,'error');
 const email='new-journey@example.test',password='journey-local-2026';
 await call('loginAction',['',form({email,password,mode:'register',next:`/sites/${siteId}`})],'/login');
 const owner=(await authenticate(email,password))!;assert.ok(owner);assert.equal((await store.getSite(siteId))?.ownerId,owner.id);assert.deepEqual((await store.getSite(siteId))?.published,published);
 assert.equal((await get(`/preview/${siteId}/1`,guest)).status,404);
 const verifyText=await mailFor(email,'/verify-email#');const proof=new URL(verifyText.match(/http[^\s]+/)![0]).hash.slice(7);
 const verified=await call('verifyEmailAction',['idle',form({token:proof})],'/verify-email');assert.match(verified.text,/done/);assert.equal((await accountSummary(owner)).verified,true);
 console.log('PASS guest one-click create -> confirm facts -> first publication -> signup claim -> local email confirmation; guest cannot edit or retain ownership.');
 // AI-предложение отдельно от версии и публикации; отклонение не стирает историю расхода.
 async function edit(){const q=await call('editSiteAction',[siteId,{status:'idle'},form({request:'Make the hero calmer'})]);assert.equal(q.data.status,'estimate');return call('editSiteAction',[siteId,{status:'idle'},form({request:'Make the hero calmer',decision:'confirm',estimateId:q.data.estimate.id})]);}
 assert.equal((await edit()).data.status,'review');assert.equal((await store.getSite(siteId))?.currentVersion,1);
 await review('editSiteAction','discard');assert.equal(await store.getPendingEdit(siteId),null);assert.equal((await store.getSite(siteId))?.currentVersion,1);
 assert.equal((await edit()).data.status,'review');await review('editSiteAction','apply');assert.equal((await store.getSite(siteId))?.currentVersion,2);assert.equal(await(await get('/live/'+published.slug,'')).text(),original);
 assert.ok((await readdir(path.join(root,'sites',siteId,'ai-requests'))).length>=2);
 // Свой код: изоляция, отклонение, добавление, обновление, удаление и восстановление.
 const code={title:'Journey counter',html:'<button id="count">0</button>',css:'button{color:purple}',js:'document.getElementById("count").onclick=e=>e.target.textContent++',height:'240',mobileHeight:'360'};
 async function codeEdit(index='new',extra:Record<string,string>={},token=cookie){return call('codeAction',[siteId,{status:'idle'},form({...code,index,after:'footer',baseVersion:String((await store.getSite(siteId))!.currentVersion),...extra})],undefined,token);}
 assert.notEqual((await codeEdit('new',{},foreign)).data?.status,'review');assert.equal(await store.getPendingEdit(siteId),null);
 await codeEdit();const firstCodeProposal=(await store.getPendingEdit(siteId))!;
 assert.equal((await codeEdit()).data.status,'error');assert.equal((await store.getPendingEdit(siteId))?.id,firstCodeProposal.id);
 await review('codeAction','discard');assert.equal((await store.getSite(siteId))?.currentVersion,2);
 await codeEdit();await review('codeAction','apply');const codeVersion=(await store.getSite(siteId))!.currentVersion;assert.equal(codeVersion,3);
 const block=codeBlocks((await store.getVersion(siteId,3))!.doc)[0];assert.equal(block.code.html,code.html);
 const beforeCode=(await store.getVersion(siteId,2))!.doc,afterCode=(await store.getVersion(siteId,3))!;
 assert.deepEqual(afterCode.doc.sections.filter(s=>s.composition!=='embed.code'),beforeCode.sections);assert.deepEqual(afterCode.doc.meta,beforeCode.meta);assert.deepEqual(afterCode.doc.factsToConfirm,beforeCode.factsToConfirm);assert.equal(afterCode.usage.costUsd,0);
 assert.equal((await codeEdit(String(block.index),{baseVersion:'2'})).data.status,'error');assert.equal(await store.getPendingEdit(siteId),null);
 assert.equal((await codeEdit('0',{intent:'remove'})).data.status,'error');assert.equal(await store.getPendingEdit(siteId),null);
 await codeEdit(String(block.index),{height:'320'});await review('codeAction','apply');assert.equal(codeBlocks((await store.getVersion(siteId,4))!.doc)[0].code.height,320);
 await codeEdit(String(block.index),{intent:'remove'});await review('codeAction','apply');assert.equal(codeBlocks((await store.getVersion(siteId,5))!.doc).length,0);
 await call('revertAction',[siteId,codeVersion]);assert.equal(codeBlocks((await store.getVersion(siteId,6))!.doc)[0].code.html,code.html);assert.equal((await store.getSite(siteId))?.published?.version,1);
 // Реальная загрузка изображения и отдельная ручная правка метаданных.
 const image=await sharp({create:{width:64,height:48,channels:3,background:'#1bcc64'}}).png().toBuffer();
 const upload=await fetch(base+`/sites/${siteId}/images`,{method:'POST',headers:{...auth(),origin:base,'content-type':'image/png'},body:new Uint8Array(image)});assert.equal(upload.status,200);const {src}=await upload.json();assert.equal((await get(src,'')).status,404);
 async function content(changes:unknown[],intent='update'){const version=(await store.getSite(siteId))!.currentVersion;return call('contentAction',[siteId,{status:'idle'},form({section:'-1',baseVersion:String(version),intent,changes:JSON.stringify(changes)})]);}
 assert.equal((await content([{path:'title',value:'Demo journey owner title'}])).data.status,'review');await review('contentAction','apply');
 assert.equal((await content([{path:'photo',value:{src,subject:'Demo owner image'}}],'add-image')).data.status,'review');await review('contentAction','apply');
 console.log('PASS AI discard/apply and usage history, own code add/edit/delete/restore, owner-only actions, image upload and manual metadata; published v1 remains unchanged.');
 // Форма, подтверждённый получатель, очередь уведомления и заявка посетителя.
 await call('enquiryFormAction',[siteId,{status:'idle'},form({baseVersion:String((await store.getSite(siteId))!.currentVersion),kind:'full'})]);await review('enquiryFormAction','apply');
 await call('enquiryRecipientAction',[siteId,'idle',form({email})]);await call('enquiryNotificationsAction',[siteId,'idle',form({enabled:'1'})]);
 assert.equal((await call('publishAction',[siteId])).data.status,'live');assert.equal((await get(src,'')).status,200);
 const html=await(await get('/live/'+published.slug,'')).text();const token=html.match(/name="token" value="([^"]+)"/)?.[1];assert.ok(token);
 const send=()=>fetch(base+`/live/${published.slug}/enquiry`,{method:'POST',headers:{origin:base.replace('http:','https:'),'content-type':'application/x-www-form-urlencoded',accept:'application/json'},body:new URLSearchParams({token,submission:'journey-single',name:'Demo visitor',contact:'visitor@example.test',message:'DEMO JOURNEY ENQUIRY',extra_reference:''})});
 assert.equal((await send()).status,200);assert.equal((await send()).status,200);assert.equal((await store.listEnquiries(siteId)).length,1);
 const privateInbox='/sites/'+siteId+'/enquiries';assert.ok((await(await get(privateInbox)).text()).includes('DEMO JOURNEY ENQUIRY'));assert.ok(!(await(await get(privateInbox,foreign)).text()).includes('DEMO JOURNEY ENQUIRY'));
 await mailFor(email,'/enquiries');
 // Все три отчёта на том же сайте; без поддельного браузерного скана.
 const works=await call('startWorksAction',[siteId]);assert.equal(works.data.ok,true);assert.equal((await call('finishWorksAction',[siteId,works.data.fingerprint,[]])).data.ok,true);
 const search=await call('startSearchAction',[siteId,'draft']);assert.equal(search.data.ok,true);assert.equal((await call('finishSearchAction',[siteId,search.data.evidence,search.data.signature,null])).data.ok,true);
 const site=(await store.getSite(siteId))!,version=(await store.getVersion(siteId,site.currentVersion))!;
 const fingerprint=requirementsFingerprint(site,version,'draft',await store.getRequirementsProfile(siteId));assert.equal((await call('runRequirementsAction',[siteId,'draft',fingerprint])).data.ok,true);
 const backup=await get('/sites/'+siteId+'/backup');assert.equal(backup.status,200);const bytes=await backup.text();
 const restore=async(mode:string)=>fetch(base+'/sites/restore?mode='+mode,{method:'POST',headers:{...auth(),origin:base,'content-type':'application/json','x-windx-confirm-backup':'1','x-windx-restore-id':requestId},body:bytes});
 const requestId=randomUUID();assert.equal((await restore('review')).status,200);const restored=await(await restore('restore')).json();assert.ok(restored.id);assert.equal((await store.getSite(restored.id))?.published,undefined);assert.equal((await store.getSite(restored.id))?.ownerId,owner.id);
 await call('unpublishAction',[siteId]);const offline=await get('/live/'+published.slug,'');assert.equal(offline.status,404);assert.match(offline.headers.get('cache-control')! ,/no-store/);assert.equal((await get(src,'')).status,404);
 await call('publishAction',[siteId]);assert.equal((await get('/live/'+published.slug,'')).status,200);
 await call('logoutAction',[],'/sites');const login=await call('loginAction',['',form({email,password,next:`/sites/${siteId}`})],'/login','');assert.match(login.response.headers.get('x-action-redirect')??'',new RegExp(siteId));assert.equal((await get('/preview/'+siteId+'/'+version.n)).status,200);
 console.log('PASS form -> deduplicated private enquiry -> local owner notification; three persisted reports, project download/review/restore, offline/no-store/republish, logout and repeat login retain ownership.');
 // Ссылка выдаётся тестовой фикстурой; обработчик смены и повторного входа настоящий.
 const reset=await issueSecurityToken(email,'reset');assert.ok(reset);const previousSession=cookie;
 assert.match((await call('resetPasswordAction',['idle',form({token:reset,password:'short',confirm:'short'})],'/reset-password')).text,/passwordShort/);
 const nextPassword='journey-next-2026';assert.match((await call('resetPasswordAction',['idle',form({token:reset,password:nextPassword,confirm:nextPassword})],'/reset-password')).text,/done/);
 assert.ok(!(await(await get('/account',previousSession)).text()).includes(email));assert.equal(await authenticate(email,password),null);
 const relogin=await call('loginAction',['',form({email,password:nextPassword,next:`/sites/${siteId}`})],'/login','');assert.match(relogin.response.headers.get('x-action-redirect')??'',new RegExp(siteId));assert.equal((await store.getSite(siteId))?.ownerId,owner.id);
 assert.match((await call('resetPasswordAction',['idle',form({token:reset,password:nextPassword,confirm:nextPassword})],'/reset-password')).text,/invalid/);
 await mailFor(email,'previous sessions');
 console.log('PASS reset validation preserves token, password change revokes previous session, new login retains site, reset replay denied; local password-change mail.');
 assert.ok(!logs.includes(password));
} catch(error){console.error(logs.slice(-1200));throw error;} finally {server.kill('SIGTERM');if(server.exitCode===null)await new Promise(r=>server.once('exit',r));await rm(root,{recursive:true,force:true});}
