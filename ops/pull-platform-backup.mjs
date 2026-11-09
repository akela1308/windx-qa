import {spawnSync} from 'node:child_process';
import {mkdir,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const repo='akela1308/windx';
function run(command,args){const r=spawnSync(command,args,{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr?.trim()||`${command} failed`);return r.stdout;}
let folder,owned=false;
try{
 const runs=JSON.parse(run('gh',['run','list','--repo',repo,'--workflow','platform-backup.yml','--status','success','--limit','1','--json','databaseId,headBranch']));
 if(!runs.length||runs[0].headBranch!=='main')throw Error('No successful main backup run');
 const id=String(runs[0].databaseId);if(!/^\d+$/.test(id))throw Error('Invalid workflow run');
 const parent=path.resolve('data/platform-recovery/copies');await mkdir(parent,{recursive:true,mode:0o700});
 folder=path.join(parent,`github-${id}-${randomUUID()}`);await mkdir(folder,{mode:0o700});owned=true;
 run('gh',['run','download',id,'--repo',repo,'--name',`windx-encrypted-platform-${id}`,'--dir',folder]);
 run(process.execPath,['ops/verify-backup-download.mjs',folder]);
 const info=JSON.parse(await readFile(path.join(folder,'latest.json'),'utf8'));
 console.log(JSON.stringify({verified:true,archive:path.join(folder,info.file),createdAt:info.createdAt,contents:info.contents}));
}catch(e){if(owned)await rm(folder,{recursive:true,force:true});console.error('Backup download failed:',e.message);process.exitCode=1;}
