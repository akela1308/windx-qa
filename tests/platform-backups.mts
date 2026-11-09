import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,symlink,lstat,unlink,utimes} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {generateKeyPairSync,createHash,randomBytes,publicEncrypt,createCipheriv} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createBackup,restoreBackup,recoveryConfig,scheduledBackup,fingerprint} from '../ops/platform-backup.mjs';
const work=await mkdtemp(path.join(os.tmpdir(),'windx-platform-backup-test-'));
const keys=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{format:'pem',type:'spki'},privateKeyEncoding:{format:'pem',type:'pkcs8'}});
const privatePath=path.join(work,'private.pem');await writeFile(privatePath,keys.privateKey,{mode:0o600});
const root=path.join(work,'source');
async function save(name:string,content:string|Buffer){const p=path.join(root,name);await mkdir(path.dirname(p),{recursive:true});await writeFile(p,content);}
await save('auth/users/account.json',JSON.stringify({id:'owner',email:'backup-test@example.test',passwordHash:'synthetic'}));
await save('auth/sessions/old.json','{"old":"session"}');
await save('auth/security-tokens/old.json','{"old":"reset"}');
await save('auth/ai-estimates/old.json','{"approved":true}');
await save('sites/site/site.json',JSON.stringify({id:'site',ownerId:'owner',currentVersion:1,versionCount:1,published:{version:1}}));
await save('sites/site/versions/1.json','{"n":1,"doc":{"content":"saved text"}}');
await save('sites/site/media/image.webp',Buffer.from([1,2,3,4]));
await save('sites/site/pending-edit.json','{"proposal":"kept"}');
const enquiry='a'.repeat(64);
await save(`sites/site/enquiries/${enquiry}.json`,JSON.stringify({id:enquiry,notificationJob:{to:'owner'},notification:{status:'queued'}}));
await save('domains/connections.json','{}');
await save('sites/site/uncommitted.tmp','temporary');
const archive=path.join(work,'first.windx.enc');
const summary=await createBackup({root,output:archive,publicKey:keys.publicKey,config:{RESEND_API_KEY:'synthetic-not-a-real-secret'},release:'fixture'});
assert.ok(summary.files>=8);assert.equal(summary.sha256,createHash('sha256').update(await readFile(archive)).digest('hex'));
assert.equal((await readFile(archive)).includes(Buffer.from('synthetic-not-a-real-secret')),false);
const restored=path.join(work,'restored');const result=await restoreBackup({archive,privateKey:privatePath,destination:restored});
assert.equal(result.release,'fixture');assert.equal(result.pendingNotificationsCancelled,1);
assert.deepEqual(await readFile(path.join(restored,'data/sites/site/media/image.webp')),Buffer.from([1,2,3,4]));
assert.equal(JSON.parse(await readFile(path.join(restored,'data/sites/site/pending-edit.json'),'utf8')).proposal,'kept');
assert.equal(JSON.parse(await readFile(path.join(restored,'configuration.json'),'utf8')).RESEND_API_KEY,'synthetic-not-a-real-secret');
assert.equal(JSON.parse(await readFile(path.join(restored,`data/sites/site/enquiries/notifications/${enquiry}.json`),'utf8')).status,'cancelled');
for(const dir of ['sessions','security-tokens','ai-estimates'])await assert.rejects(readdir(path.join(restored,'data/auth',dir)),{code:'ENOENT'});
await assert.rejects(restoreBackup({archive,privateKey:privatePath,destination:restored}),{code:'EEXIST'});
assert.equal((await lstat(path.join(restored,'configuration.json'))).mode&0o777,0o600);
const damaged=path.join(work,'damaged.windx.enc'),bytes=await readFile(archive);bytes[bytes.length-20]^=1;await writeFile(damaged,bytes);
const failed=path.join(work,'failed');await assert.rejects(restoreBackup({archive:damaged,privateKey:privatePath,destination:failed}));await assert.rejects(lstat(failed),{code:'ENOENT'});
const publicPath=path.join(work,'public.pem');await writeFile(publicPath,keys.publicKey);
const scheduled=await scheduledBackup({root,publicKey:publicPath,env:{WINDX_AUTH_ORIGIN:'https://fixture'}});
assert.equal((await scheduledBackup({root,publicKey:publicPath})).sha256,scheduled.sha256);
const lock=path.join(root,'platform-backups/backup.lock');await mkdir(lock);await writeFile(path.join(lock,'owner'),'fixture');
await assert.rejects(scheduledBackup({root,publicKey:publicPath}),/already running/);
const yesterday=new Date(Date.now()-3600_000);await utimes(lock,yesterday,yesterday);
assert.equal((await scheduledBackup({root,publicKey:publicPath})).sha256,scheduled.sha256);await assert.rejects(lstat(lock),{code:'ENOENT'});
await assert.rejects(createBackup({root,output:archive,publicKey:keys.publicKey}),{code:'EEXIST'});
assert.equal(createHash('sha256').update(await readFile(archive)).digest('hex'),summary.sha256);
async function forged(rows:unknown[],name:string){
 const createdAt=new Date().toISOString(),aes=randomBytes(32),iv=randomBytes(12);
 const header={format:1,algorithm:'RSA-OAEP-SHA256/AES-256-GCM+GZIP',createdAt,keyId:fingerprint(keys.publicKey),sealedKey:publicEncrypt({key:keys.publicKey,oaepHash:'sha256'},aes).toString('base64'),iv:iv.toString('base64')};
 const aad=Buffer.from('WINDX-PLATFORM-BACKUP/1\n'+JSON.stringify(header)+'\n');
 const cipher=createCipheriv('aes-256-gcm',aes,iv);cipher.setAAD(aad);
 const body=gzipSync([{type:'meta',format:1,createdAt,config:{}},...rows].map(v=>JSON.stringify(v)+'\n').join(''));
 const file=path.join(work,name+'.windx.enc');await writeFile(file,Buffer.concat([aad,cipher.update(body),cipher.final(),cipher.getAuthTag()]));return file;
}
for(const [name,rows]of [
 ['traversal',[{type:'file',path:'../escaped',size:1,data:'eA==',sha256:'fake'}]],
 ['absolute',[{type:'file',path:'/tmp/escaped',size:1,data:'eA==',sha256:'fake'}]],
 ['link',[{type:'symlink',path:'auth/link',target:'../../outside'}]],
 ['duplicate',[{type:'directory',path:'auth'},{type:'directory',path:'auth'}]],
 ['incomplete',[{type:'directory',path:'auth'},{type:'directory',path:'sites'}]],
]as const){
 const file=await forged([...rows],name),dest=path.join(work,'reject-'+name);
 await assert.rejects(restoreBackup({archive:file,privateKey:privatePath,destination:dest}));await assert.rejects(lstat(dest),{code:'ENOENT'});
}
const wrong=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
const wrongKey=path.join(work,'wrong.pem');await writeFile(wrongKey,wrong.privateKey);
await assert.rejects(restoreBackup({archive,privateKey:wrongKey,destination:path.join(work,'wrong-key')}),/Wrong recovery key/);
await symlink(privatePath,path.join(root,'sites/site/bad-link'));
await assert.rejects(createBackup({root,output:path.join(work,'bad.windx.enc'),publicKey:keys.publicKey}),/Symlinks/);
await unlink(path.join(root,'sites/site/bad-link'));
await unlink(path.join(root,'sites/site/versions/1.json'));
await assert.rejects(createBackup({root,output:path.join(work,'missing.windx.enc'),publicKey:keys.publicKey}),/version missing/);
assert.deepEqual(recoveryConfig({WINDX_AUTH_ORIGIN:'https://test',RESEND_API_KEY:'fake',PATH:'/bin',RAILWAY_TOKEN:'not-an-app-setting'}),{WINDX_AUTH_ORIGIN:'https://test',RESEND_API_KEY:'fake'});
console.log('PASS full encrypted snapshot and isolated restore; accounts, versions, media, proposals, enquiries and config retained; old sessions/links/AI approvals removed, queued mail held, tampering, wrong key, unsafe paths, duplicate/incomplete records, missing versions and clobber rejected; daily deduplication and stale lease recovery passed.');
