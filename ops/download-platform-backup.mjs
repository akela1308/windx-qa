import {mkdir,writeFile,rm} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import {publicManifest} from './platform-backup-http.mjs';
const base='https://www.windx.app/internal/platform-backup',folder=path.resolve(process.argv[2]??'offsite');
const token=process.env.RAILWAY_TOKEN;if(!token)throw Error('Project token missing');
const headers={Authorization:`Bearer ${token}`};
async function get(url){const r=await fetch(url,{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(60_000)});if(!r.ok)throw Error(`Backup download refused (HTTP ${r.status})`);return r;}
let owned=false;
try{
 await mkdir(folder,{mode:0o700}); owned=true; // refuse an existing target
 const manifest=publicManifest(await (await get(base)).json());
 await writeFile(path.join(folder,'latest.json'),JSON.stringify(manifest),{flag:'wx',mode:0o600});
 const response=await get(base+'?file='+encodeURIComponent(manifest.file));
 let total=0;const limited=new Transform({transform(chunk,_,done){total+=chunk.length;if(total>manifest.archiveBytes)return done(Error('Download exceeds declared size'));done(null,chunk);}});
 await pipeline(Readable.fromWeb(response.body),limited,createWriteStream(path.join(folder,manifest.file),{flags:'wx',mode:0o600}));
 if(total!==manifest.archiveBytes)throw Error('Truncated backup download');
 console.log(JSON.stringify({downloaded:true,createdAt:manifest.createdAt,archiveBytes:total}));
}catch(e){if(owned)await rm(folder,{recursive:true,force:true});console.error('Encrypted backup download failed:',e.message);process.exitCode=1;}
