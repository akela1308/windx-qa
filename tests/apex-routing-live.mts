import assert from 'node:assert/strict';

// Только явный ручной запуск: публичные страницы и одна заведомо неверная попытка входа.
// Не создаёт аккаунты, не отправляет письма, не меняет сайты и не использует пароль владельца.
if(process.env.WINDX_LIVE_ROUTING_CHECK!=='1') {
 console.log('SKIP: set WINDX_LIVE_ROUTING_CHECK=1 to check real windx.app routing.');
 process.exit(0);
}
const root='https://windx.app',canonical='https://www.windx.app';
const paths=['/','/how','/templates','/new','/login?next=%2Fsites%2Fnotify-test-20261101&routing=a%2Bb%20c','/login?mode=register','/forgot-password','/sites'];
const options=()=>({signal:AbortSignal.timeout(20000),redirect:'manual' as const});
for(const path of paths){
 const response=await fetch(root+path,options());
 assert.equal(response.status,308,`root ${path}`);
 assert.equal(response.headers.get('location'),canonical+path,`preserve path/query ${path}`);
 const final=await fetch(canonical+path,{signal:AbortSignal.timeout(20000)});
 assert.ok(final.ok,`canonical ${path}: ${final.status}`);
 assert.equal(new URL(final.url).origin,canonical);
 console.log(`PASS GET ${path}: 308 -> canonical ${final.status}`);
}
for(const method of ['HEAD','POST']){
 const r=await fetch(root+'/login?next=%2Fsites',{...options(),method,...(method==='POST'?{body:'routing-test=synthetic',headers:{'content-type':'application/x-www-form-urlencoded'}}:{})});
 assert.equal(r.status,308,method);assert.equal(r.headers.get('location'),canonical+'/login?next=%2Fsites');console.log(`PASS ${method}: method-preserving redirect`);
}
const decode=(s:string)=>s.replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const loginUrl=canonical+'/login?next=%2Fsites';
const html=await(await fetch(loginUrl,{signal:AbortSignal.timeout(20000)})).text();
const fields=new FormData();
for(const tag of html.match(/<input\b[^>]*>/gi)??[]){
 const attrs=Object.fromEntries([...tag.matchAll(/([\w$:-]+)="([^"]*)"/g)].map(m=>[m[1],decode(m[2])]));
 if(attrs.type==='hidden'&&attrs.name)fields.set(attrs.name,attrs.value??'');
}
assert.ok([...fields.keys()].some(k=>k.startsWith('$ACTION_')),'native action fields');
fields.set('email','routing-check-20261102@example.invalid');fields.set('password','routing-smoke-only');fields.set('mode','login');fields.set('locale','en');fields.set('next','/sites');
const result=await fetch(loginUrl,{method:'POST',headers:{origin:canonical,referer:loginUrl},body:fields,signal:AbortSignal.timeout(20000)});
assert.equal(result.status,200);assert.equal(new URL(result.url).origin,canonical);
assert.match(await result.text(),/Incorrect email or password\./);
console.log('PASS native login form: handled invalid synthetic credentials, no account or mail created.');
const client=await fetch('https://windx-subdomain-check-20261031.windx.app/',options());
assert.notEqual(client.headers.get('location')?.startsWith(canonical),true,'client subdomain must not redirect to cabinet');
console.log(`PASS client subdomain stays separate (${client.status}).`);
