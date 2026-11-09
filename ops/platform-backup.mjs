import {createHash, randomBytes, randomUUID, publicEncrypt, privateDecrypt, createCipheriv, createDecipheriv, createPublicKey, constants} from 'node:crypto';
import {mkdir, readdir, lstat, open, readFile, writeFile, rename, rm, statfs} from 'node:fs/promises';
import {createReadStream, createWriteStream} from 'node:fs';
import path from 'node:path';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGzip, createGunzip} from 'node:zlib';
import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';

const MAGIC='WINDX-PLATFORM-BACKUP/1\n';
const ROOTS=['auth','sites','domains'];
const OMIT_ROOTS=new Set(['backups','backup-staging','platform-backups','lost+found']);
const MAX_FILES=100000, MAX_FILE=16*1024*1024, MAX_TOTAL=2*1024**3, MAX_LINE=24*1024**2;
const hash=b=>createHash('sha256').update(b).digest('hex');
export const fingerprint=key=>hash(createPublicKey(key).export({type:'spki',format:'der'}));
const signature=s=>[s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':');
const transient=name=>/\.tmp$|\.used$|\.lock$/.test(name)||name==='write.lock';
const safeName=name=>typeof name==='string'&&name.length<1024&&!name.includes('\\')&&!name.includes('\0')&&name.split('/').every(s=>s&&s!=='.'&&s!=='..')&&ROOTS.includes(name.split('/')[0]);

function indexFile(index,name,content){
 if(name.endsWith('.json')){const row=JSON.parse(content.toString('utf8'));
  if(/^auth\/users\/[^/]+\.json$/.test(name))index.accounts++;
  if(/^sites\/[^/]+\/site\.json$/.test(name)){if(row.id!==name.split('/')[1])throw Error('Site identity does not match its path');index.sites.push(row);}
  if(/^sites\/[^/]+\/versions\/[^/]+\.json$/.test(name)){
   if(!Number.isSafeInteger(row.n)||row.n<1||!row.doc||`${row.n}.json`!==name.split('/').at(-1))throw Error('Invalid saved version');index.versions++;
  }
  if(/^sites\/[^/]+\/enquiries\/[a-f0-9]{64}\.json$/.test(name))index.enquiries++;
 }
 if(/^sites\/[^/]+\/media\/[^/]+$/.test(name))index.images++;
 index.paths.add(name);
}
function newIndex(){return {accounts:0,sites:[],versions:0,enquiries:0,images:0,paths:new Set()};}
function verifyIndex(index){
 for(const site of index.sites){
  if(!site.id||!Number.isSafeInteger(site.versionCount)||site.versionCount<1||site.versionCount>100000||!Number.isSafeInteger(site.currentVersion)||site.currentVersion<1||site.currentVersion>site.versionCount)throw Error('Invalid site metadata');
  for(let n=1;n<=site.versionCount;n++)if(!index.paths.has(`sites/${site.id}/versions/${n}.json`))throw Error('Site version missing from backup');
  if(site.published&&!index.paths.has(`sites/${site.id}/versions/${site.published.version}.json`))throw Error('Published version missing from backup');
 }
 return {accounts:index.accounts,sites:index.sites.length,versions:index.versions,enquiries:index.enquiries,images:index.images};
}
async function inventory(root,deadline=Infinity){
 const rootInfo=await lstat(root);if(!rootInfo.isDirectory()||rootInfo.isSymbolicLink())throw Error("Invalid data root");
 const found=[];let bytes=0;
 for(const name of await readdir(root)) if(!ROOTS.includes(name)&&!OMIT_ROOTS.has(name)) throw Error('Unknown data root; review backup coverage');
 async function walk(relative){
  if(Date.now()>deadline)throw Error("Backup deadline exceeded");
  if(transient(path.posix.basename(relative)))return;
  const full=path.join(root,relative),s=await lstat(full,{bigint:true});
  if(s.isSymbolicLink())throw Error('Symlinks are not supported in platform data');
  if(s.isDirectory()){
   const names=(await readdir(full)).sort();
   if(found.length>=MAX_FILES)throw Error("Backup file limit reached");
   found.push({path:relative,directory:true,signature:signature(s)});
   for(const name of names)await walk(`${relative}/${name}`);
  }else if(s.isFile()){
   if(s.nlink!==1n||s.size>BigInt(MAX_FILE))throw Error('Unsupported data file');
   bytes+=Number(s.size);if(bytes>MAX_TOTAL||found.length>=MAX_FILES)throw Error('Backup limit reached');
   found.push({path:relative,size:Number(s.size),signature:signature(s)});
  }else throw Error('Special files are not supported');
 }
 for(const name of ROOTS){try{await walk(name);}catch(e){if(e.code!=='ENOENT')throw e;}}
 return {entries:found,bytes};
}
async function sameInventory(root,expected,deadline){
 const actual=await inventory(root,deadline);
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Data changed during backup; retry');
}
export function recoveryConfig(env){
 return Object.fromEntries(Object.entries(env).filter(([k,v])=>typeof v==='string'&&(/^(WINDX_|AI_|OPENROUTER_|RESEND_|GOOGLE_)/.test(k)||['RAILWAY_PROJECT_ID','RAILWAY_ENVIRONMENT_ID','RAILWAY_SERVICE_ID'].includes(k))));
}
export async function createBackup({root,output,publicKey,config={},release='unknown'}){
 const deadline=Date.now()+15*60_000;
 root=path.resolve(root);output=path.resolve(output);
 if(path.dirname(output)===root||!path.basename(output).endsWith('.windx.enc'))throw Error('Use an explicit encrypted backup filename');
 const key=typeof publicKey==='string'&&publicKey.includes('BEGIN PUBLIC KEY')?publicKey:await readFile(publicKey,'utf8');
 const before=await inventory(root,deadline);if(!before.entries.some(e=>e.path==='auth')||!before.entries.some(e=>e.path==='sites'))throw Error('Missing canonical data roots');
 await mkdir(path.dirname(output),{recursive:true,mode:0o700});
 const space=await statfs(path.dirname(output));if(Number(space.bavail)*Number(space.bsize)<before.bytes*2+32*1024**2)throw Error('Insufficient backup disk space');
 const aes=randomBytes(32),iv=randomBytes(12),createdAt=new Date().toISOString();
 const header={format:1,algorithm:'RSA-OAEP-SHA256/AES-256-GCM+GZIP',createdAt,keyId:fingerprint(key),sealedKey:publicEncrypt({key,oaepHash:'sha256'},aes).toString('base64'),iv:iv.toString('base64')};
 const aad=Buffer.from(MAGIC+JSON.stringify(header)+'\n');
 const cipher=createCipheriv('aes-256-gcm',aes,iv);cipher.setAAD(aad);
 const temp=`${output}.${randomUUID()}.tmp`;
 const digest=createHash('sha256');const index=newIndex();let count=0,published=false;
 async function* rows(){
  yield JSON.stringify({type:'meta',format:1,createdAt,release,config})+'\n';
  for(const e of before.entries){
   if(e.directory){yield JSON.stringify({type:'directory',path:e.path})+'\n';continue;}
   const handle=await open(path.join(root,e.path),constants.O_RDONLY|constants.O_NOFOLLOW);
   let bytes;try{
    if(signature(await handle.stat({bigint:true}))!==e.signature)throw Error('Data changed during backup; retry');
    bytes=Buffer.alloc(e.size);let offset=0;
    while(offset<bytes.length){const r=await handle.read(bytes,offset,bytes.length-offset,offset);if(!r.bytesRead)throw Error('Truncated data file');offset+=r.bytesRead;}
    if(signature(await handle.stat({bigint:true}))!==e.signature)throw Error('Data changed during backup; retry');
   }finally{await handle.close();}
   indexFile(index,e.path,bytes);
   const record={type:'file',path:e.path,size:e.size,sha256:hash(bytes),data:bytes.toString('base64')};
   digest.update(JSON.stringify([record.path,record.size,record.sha256])+'\n');count++;
   yield JSON.stringify(record)+'\n';
  }
  // Matching inodes/ctime/mtime, directory membership and sizes establish a
  // common stable interval. Refuse a mixed snapshot instead of claiming success.
  verifyIndex(index);
  await sameInventory(root,before,deadline);
  yield JSON.stringify({type:'end',files:count,bytes:before.bytes,digest:digest.digest('hex')})+'\n';
 }
 try{
  const sink=createWriteStream(temp,{flags:'wx',mode:0o600});sink.write(aad);
  await pipeline(Readable.from(rows()),createGzip(),cipher,sink,{end:false,signal:AbortSignal.timeout(Math.max(1,deadline-Date.now()))});
  sink.end(cipher.getAuthTag());await new Promise((resolve,reject)=>{sink.once('finish',resolve);sink.once('error',reject);});
  // link provides no-clobber publication; never overwrite an operator's archive.
  const flush=await open(temp,'r');try{await flush.sync();}finally{await flush.close();}
  const {link}=await import('node:fs/promises');await link(temp,output);published=true;await rm(temp);
  const sha256=await fileHash(output);if(Date.now()>deadline)throw Error('Backup deadline exceeded');
  return {format:1,file:path.basename(output),createdAt,keyId:header.keyId,files:count,bytes:before.bytes,release,sha256,archiveBytes:Number((await lstat(output)).size),contents:verifyIndex(index)};
 }catch(e){await rm(temp,{force:true});if(published)await rm(output,{force:true});throw e;}finally{aes.fill(0);}
}
export async function fileHash(file){const h=createHash('sha256');for await(const b of createReadStream(file))h.update(b);return h.digest('hex');}
async function headerOf(file){
 const f=await open(file,'r');try{
  const info=await f.stat();const b=Buffer.alloc(Math.min(16384,info.size));await f.read(b,0,b.length,0);
  const start=MAGIC.length,end=b.indexOf(10,start);if(b.subarray(0,start).toString()!==MAGIC||end<0||info.size<end+18)throw Error('Invalid backup header');
  const header=JSON.parse(b.subarray(start,end).toString());if(header.format!==1||header.algorithm!=='RSA-OAEP-SHA256/AES-256-GCM+GZIP')throw Error('Unsupported backup format');
  const tag=Buffer.alloc(16);await f.read(tag,0,16,info.size-16);
  return {header,aad:b.subarray(0,end+1),start:end+1,end:info.size-17,tag};
 }finally{await f.close();}
}
function boundedLines(){let line=0,total=0;return new Transform({transform(chunk,_,done){total+=chunk.length;if(total>MAX_TOTAL*1.5+64*1024**2)return done(Error('Expanded backup too large'));
 for(const b of chunk){line=b===10?0:line+1;if(line>MAX_LINE)return done(Error('Backup record too large'));}done(null,chunk);}});}
async function sanitize(root){
 let notifications=0;
 // Restoring data must not revive login cookies, spent reset links or approvals.
 for(const name of ['sessions','security-tokens','invites','google-states','google-links','ai-estimates'])await rm(path.join(root,'auth',name),{recursive:true,force:true});
 for(const id of await readdir(path.join(root,'sites'))){
  const dir=path.join(root,'sites',id,'enquiries');let names;try{names=await readdir(dir);}catch(e){if(e.code==='ENOENT')continue;throw e;}
  for(const name of names.filter(n=>/^[a-f0-9]{64}\.json$/.test(n))){
   const record=JSON.parse(await readFile(path.join(dir,name),'utf8'));if(!record.notificationJob)continue;
   const dest=path.join(dir,'notifications',name);let status=record.notification;
   try{status=JSON.parse(await readFile(dest,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
   if(status?.status==='queued'){
    await mkdir(path.dirname(dest),{recursive:true,mode:0o700});
    await writeFile(dest,JSON.stringify({...status,status:'cancelled',nextAttemptAt:undefined}),{mode:0o600});notifications++;
   }
  }
 }
 return {sessionsAndOneTimeLinksRemoved:true,pendingNotificationsCancelled:notifications};
}
export async function restoreBackup({archive,privateKey,destination}){
 const key=await readFile(privateKey,'utf8'),head=await headerOf(archive);
 if(fingerprint(key)!==head.header.keyId)throw Error('Wrong recovery key');
 const aes=privateDecrypt({key,oaepHash:'sha256'},Buffer.from(head.header.sealedKey,'base64'));
 const decipher=createDecipheriv('aes-256-gcm',aes,Buffer.from(head.header.iv,'base64'));decipher.setAAD(head.aad);decipher.setAuthTag(head.tag);
 destination=path.resolve(destination);await mkdir(destination,{mode:0o700}); // must be new
 const staging=path.join(destination,'.incomplete');await mkdir(staging,{mode:0o700});
 const digest=createHash('sha256'),seen=new Set(),index=newIndex();let meta=null,end=null,files=0,bytes=0;
 const lines=boundedLines();
 const pumping=pipeline(createReadStream(archive,{start:head.start,end:head.end}),decipher,createGunzip(),lines);
 // Attach immediately: authentication/decompression may fail before iteration.
 pumping.catch(()=>{});
 try{
  for await(const line of createInterface({input:lines,crlfDelay:Infinity})){
   if(end)throw Error('Trailing backup records');const row=JSON.parse(line);
   if(!meta){if(row.type!=='meta'||row.format!==1||row.createdAt!==head.header.createdAt||!row.config||typeof row.config!=='object')throw Error('Invalid backup metadata');meta=row;continue;}
   if(row.type==='end'){end=row;continue;}
   if(!safeName(row.path)||seen.has(row.path)||seen.size>=MAX_FILES)throw Error('Invalid or duplicate backup path');seen.add(row.path);
   const target=path.join(staging,row.path);
   if(row.type==='directory'){await mkdir(target,{recursive:true,mode:0o700});continue;}
   if(row.type!=='file'||!Number.isSafeInteger(row.size)||row.size<0||row.size>MAX_FILE||typeof row.data!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(row.data))throw Error('Invalid backup file');
   const content=Buffer.from(row.data,'base64');if(content.length!==row.size||hash(content)!==row.sha256)throw Error('Backup file checksum mismatch');
   indexFile(index,row.path,content);
   bytes+=row.size;files++;if(bytes>MAX_TOTAL)throw Error('Backup too large');
   await mkdir(path.dirname(target),{recursive:true,mode:0o700});await writeFile(target,content,{flag:'wx',mode:0o600});
   digest.update(JSON.stringify([row.path,row.size,row.sha256])+'\n');
  }
  await pumping; // GCM authentication must finish before any restored tree is published.
  if(!meta||!end||end.files!==files||end.bytes!==bytes||end.digest!==digest.digest('hex'))throw Error('Incomplete backup');
  for(const name of ['auth','sites'])if(!seen.has(name))throw Error('Missing canonical data roots');
  const contents=verifyIndex(index);
  const safety=await sanitize(staging);
  await rename(staging,path.join(destination,'data'));
  await writeFile(path.join(destination,'configuration.json'),JSON.stringify(meta.config),{flag:'wx',mode:0o600});
  const summary={format:1,createdAt:meta.createdAt,release:meta.release,files,bytes,contents,...safety,restoredAt:new Date().toISOString()};
  await writeFile(path.join(destination,'restore-summary.json'),JSON.stringify(summary,null,2),{flag:'wx',mode:0o600});
  return summary;
 }catch(e){lines.destroy();await pumping.catch(()=>{});await rm(destination,{recursive:true,force:true});throw e;}finally{aes.fill(0);}
}
async function backupLease(output){
 const lock=path.join(output,'backup.lock'),token=randomUUID();
 try{await mkdir(lock,{mode:0o700});}
 catch(e){
  if(e.code!=='EEXIST')throw e;
  if(Date.now()-Number((await lstat(lock)).mtimeMs)<30*60_000)throw Error('Backup already running');
  // Captures time out after 15 minutes. A 30-minute lease can only be stale.
  const stale=path.join(output,`stale-${randomUUID()}.lock`);await rename(lock,stale);
  await rm(stale,{recursive:true,force:true});await mkdir(lock,{mode:0o700});
 }
 await writeFile(path.join(lock,'owner'),token,{flag:'wx',mode:0o600});
 return async()=>{try{if(await readFile(path.join(lock,'owner'),'utf8')===token)await rm(lock,{recursive:true,force:true});}catch(e){if(e.code!=='ENOENT')throw e;}};
}
/** @param {{root:string, publicKey:string, release?:string, env?:Record<string,string|undefined>}} options */
export async function scheduledBackup({root,publicKey,release='unknown',env=process.env}){
 const output=path.join(root,'platform-backups');await mkdir(output,{recursive:true,mode:0o700});
 const releaseLock=await backupLease(output);
 try{
  let previous;try{previous=JSON.parse(await readFile(path.join(output,'latest.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(previous?.createdAt?.slice(0,10)===new Date().toISOString().slice(0,10)&&/^[A-Za-z0-9-]+\.windx\.enc$/.test(previous.file)){
   const key=await readFile(publicKey,'utf8');
   try{if(previous.keyId===fingerprint(key)&&await fileHash(path.join(output,previous.file))===previous.sha256)return previous;}catch(e){if(e.code!=='ENOENT')throw e;}
  }
  let result;
  for(let attempt=0;attempt<3;attempt++){
   const file=path.join(output,`${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID()}.windx.enc`);
   try{result=await createBackup({root,output:file,publicKey,release,config:recoveryConfig(env)});break;}
   catch(e){if(!/changed during backup|Truncated data file|ENOENT/.test(e.message)||attempt===2)throw e;}
  }
  const temp=path.join(output,`${randomUUID()}.tmp`);await writeFile(temp,JSON.stringify(result),{mode:0o600,flag:'wx'});await rename(temp,path.join(output,'latest.json'));
  // Only this tool's immutable encrypted archives; never ownership/user backups.
  const names=(await readdir(output)).filter(n=>/^\d{4}-\d\d-\d\dT[\dTZ-]+-[a-f0-9-]{36}\.windx\.enc$/.test(n)).sort().reverse();
  for(const name of names.slice(3))await rm(path.join(output,name));
  return result;
 }finally{await releaseLock();}
}
export async function startPlatformBackups(){
 const cfg=JSON.parse(await readFile(path.join(process.cwd(),'ops/platform-backup-config.json'),'utf8'));
 if(process.env.RAILWAY_PROJECT_ID!==cfg.project||process.env.RAILWAY_SERVICE_ID!==cfg.service||process.env.RAILWAY_ENVIRONMENT_ID!==cfg.environment||process.env.WINDX_DATA_DIR!=='/data')return;
 const state=globalThis; if(state.windxPlatformBackupTimer)return;
 const run=async()=>{
  try{let release='unknown';try{release=JSON.parse(await readFile('ops/release.json','utf8')).commit;}catch{}
   const result=await scheduledBackup({root:'/data',publicKey:path.join(process.cwd(),'ops/backup-public-key.pem'),release});
   console.info('WINDX platform backup ready',JSON.stringify({createdAt:result.createdAt,files:result.files,archiveBytes:result.archiveBytes}));
  }catch{console.error('WINDX platform backup failed; inspect backup worker and offsite workflow');}
 };
 void run();state.windxPlatformBackupTimer=setInterval(()=>{void run();},3600_000);state.windxPlatformBackupTimer.unref();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [command,...args]=process.argv.slice(2);
 try{
  let result;
  if(command==='create'&&args.length===3)result=await createBackup({root:args[0],output:args[1],publicKey:args[2],config:recoveryConfig(process.env)});
  else if(command==='restore'&&args.length===3)result=await restoreBackup({archive:args[0],privateKey:args[1],destination:args[2]});
  else throw Error('Usage: create <data-root> <new.windx.enc> <public.pem> | restore <archive> <private.pem> <NEW-directory>');
  console.log(JSON.stringify(result));
 }catch(e){console.error('Platform backup operation failed:',e instanceof SyntaxError?'Malformed backup JSON':e.message);process.exitCode=1;}
}
