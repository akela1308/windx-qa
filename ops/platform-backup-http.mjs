import {open} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
const MAX_ARCHIVE=20*1024**2;
const FILE=/^\d{4}-\d\d-\d\dT[\dTZ-]+-[a-f0-9-]{36}\.windx\.enc$/;
const HEADERS={'Cache-Control':'private, no-store, max-age=0','Vary':'Authorization','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'};
const failure=(status)=>new Response('Backup unavailable',{status,headers:HEADERS});
let budget={until:0,n:0};
async function boundedRead(file,max){
 const f=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const info=await f.stat();if(!info.isFile()||info.size>max)throw Error('Invalid backup file');
  const bytes=Buffer.alloc(info.size);let offset=0;
  while(offset<bytes.length){const r=await f.read(bytes,offset,bytes.length-offset,offset);if(!r.bytesRead)throw Error('Truncated backup');offset+=r.bytesRead;}
  const after=await f.stat();if(after.size!==info.size||after.mtimeMs!==info.mtimeMs)throw Error('Backup changed');return bytes;
 }finally{await f.close();}
}
export function publicManifest(value){
 if(value?.format!==1||!FILE.test(value.file)||!/^[a-f0-9]{64}$/.test(value.sha256)||!/^[a-f0-9]{64}$/.test(value.keyId)||!Number.isSafeInteger(value.archiveBytes)||value.archiveBytes<100||value.archiveBytes>MAX_ARCHIVE||!Number.isFinite(Date.parse(value.createdAt)))throw Error('Invalid backup index');
 const age=Date.now()-Date.parse(value.createdAt);if(age< -300000||age>30*3600_000)throw Error('Stale backup');
 for(const name of ['files','bytes'])if(!Number.isSafeInteger(value[name])||value[name]<0)throw Error('Invalid counts');
 const contents={};for(const name of ['accounts','sites','versions','enquiries','images']){if(!Number.isSafeInteger(value.contents?.[name])||value.contents[name]<0)throw Error('Invalid contents');contents[name]=value.contents[name];}
 return {format:1,file:value.file,sha256:value.sha256,keyId:value.keyId,archiveBytes:value.archiveBytes,createdAt:value.createdAt,files:value.files,bytes:value.bytes,release:/^[a-f0-9]{40}$/.test(value.release)?value.release:'unknown',contents};
}
/** @param {Request} request @param {{root:string,project:string,environment:string}} config */
export async function exportPlatformBackup(request,config,send=fetch){
 if(request.method!=='GET')return failure(405);
 const auth=request.headers.get('authorization')??'';
 if(!/^Bearer [A-Za-z0-9._-]{20,256}$/.test(auth))return failure(401);
 const now=Date.now();if(budget.until<=now)budget={until:now+60_000,n:0};if(++budget.n>60)return failure(429);
 const url=new URL(request.url),file=url.searchParams.get('file');
 if([...url.searchParams.keys()].some(k=>k!=='file')||url.searchParams.getAll('file').length>1||(file!==null&&!FILE.test(file)))return failure(400);
 try{
  // Reuse the existing project-scoped CI credential. Railway verifies its
  // current project/environment; no new bearer secret or SSH key is granted.
  const response=await send('https://backboard.railway.com/graphql/v2',{method:'POST',headers:{'content-type':'application/json','Project-Access-Token':auth.slice(7)},body:JSON.stringify({query:'query { projectToken { projectId environmentId } }'}),signal:AbortSignal.timeout(10_000),redirect:'error',cache:'no-store'});
  if(!response.ok)return failure([401,403].includes(response.status)?403:503);
  const scope=(await response.json()).data?.projectToken;
  if(scope?.projectId!==config.project||scope?.environmentId!==config.environment)return failure(403);
  const dir=path.join(config.root,'platform-backups');
  if(file===null){const manifest=publicManifest(JSON.parse((await boundedRead(path.join(dir,'latest.json'),32768)).toString()));return Response.json(manifest,{headers:HEADERS});}
  const bytes=await boundedRead(path.join(dir,file),MAX_ARCHIVE);
  if(!bytes.subarray(0,24).toString().startsWith('WINDX-PLATFORM-BACKUP/1\n'))return failure(503);
  return new Response(new Uint8Array(bytes),{headers:{...HEADERS,'Content-Type':'application/octet-stream','Content-Length':String(bytes.length),'Content-Disposition':`attachment; filename="${file}"`}});
 }catch{return failure(503);}
}
