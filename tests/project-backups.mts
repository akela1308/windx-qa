import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, readdir, rm, stat, symlink} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import sharp from 'sharp';
import {FileSiteStore} from '../src/lib/storage/file-store';import {saveImage} from '../src/lib/media/files';
import {exportBackup, parseBackup, restoreBackup, withBackupSlot} from '../src/lib/backups/service';
import {backupSummary, BackupError, MAX_BACKUP} from '../src/lib/backups/format';
import type {Site,SiteVersion} from '../src/lib/storage/types';
const root=await mkdtemp(path.join(os.tmpdir(),'windx-project-backup-'));process.env.WINDX_DATA_DIR=root;
try {
 const store=new FileSiteStore(root),now=new Date().toISOString();
 const site:Site={id:'original',ownerId:'owner-original',name:'Restorable studio',brief:'Original brief',facts:{'A fact':'confirmed'},createdAt:now,updatedAt:now,currentVersion:1,versionCount:2,published:{slug:'existing-address',version:2,at:now},enquiryRecipient:{email:'private@example.test',confirmedAt:now},enquiryNotifications:{id:'private-config',enabled:true,ownerId:'owner-original',email:'private@example.test',locale:'en'}};
 await store.saveSite(site);
 const image=await saveImage(site.id,await sharp({create:{width:30,height:20,channels:3,background:'#ff0000'}}).png().toBuffer());
 await saveImage(site.id,await sharp({create:{width:10,height:10,channels:3,background:'#0000ff'}}).png().toBuffer());
 const doc=JSON.parse(await readFile('docs/experiment-1c/outputs/bike/light.json','utf8'));doc.sections.splice(2,0,{id:'uploaded',composition:'media.image',tone:'default',props:{photo:{src:image,subject:'Private original photo',fit:'contain'}}});
 doc.sections.splice(3,0,{id:'code',composition:'embed.code',tone:'default',props:{title:'Custom block',html:'<p>Preserve me</p>',css:'p{color:blue}',js:'console.log("kept")',height:200,mobileHeight:150}});
 const version:SiteVersion={n:1,createdAt:now,action:'create',request:'First request',reply:'First reply',doc,usage:{inputTokens:42,outputTokens:10,costUsd:.01,estimated:false},demo:false};
 await store.addVersion(site.id,version);await store.addVersion(site.id,{...version,n:2,action:'manual',request:'Second version',doc:{...doc,meta:{...doc.meta,title:'Second title'}}});
 await store.prepareEnquiryInbox(site.id);await writeFile(path.join(root,'sites/original/enquiries/private.json'),'PRIVATE_ENQUIRY');await store.savePendingEdit(site.id,{id:'pending',baseVersion:1,version:{...version,reply:'UNAPPLIED_SECRET'}});
 const exported=await exportBackup(store,site),backup=await parseBackup(exported);assert.equal(backup.images.length,2);assert.equal(backupSummary(backup).customCode,true);
 const text=exported.toString();for(const secret of ['PRIVATE_ENQUIRY','UNAPPLIED_SECRET','private@example.test','private-config','owner-original','existing-address']) assert.ok(!text.includes(secret),secret);
 const restoredId=await restoreBackup(backup,'new-owner'),restored=(await store.getSite(restoredId))!;
 assert.equal(restored.ownerId,'new-owner');assert.equal(restored.currentVersion,1);assert.equal(restored.versionCount,2);assert.deepEqual(restored.facts,site.facts);assert.equal(restored.published,undefined);assert.equal(restored.enquiryRecipient,undefined);assert.equal(restored.enquiryNotifications,undefined);assert.deepEqual(await store.listEnquiries(restoredId),[]);assert.equal(await store.getPendingEdit(restoredId),null);
 for(const n of [1,2]) {const v=(await store.getVersion(restoredId,n))!;assert.deepEqual(v,{...(await store.getVersion(site.id,n)),doc:JSON.parse(JSON.stringify((await store.getVersion(site.id,n))!.doc).split('/media/original/').join(`/media/${restoredId}/`))});}
 const file=backup.images[0].name;assert.deepEqual(await readFile(path.join(root,'sites/original/media',file)),await readFile(path.join(root,'sites',restoredId,'media',file)));assert.equal((await stat(path.join(root,'sites',restoredId,'site.json'))).mode&0o777,0o600);
 assert.deepEqual(await store.getSite(site.id),site);assert.equal((await readdir(path.join(root,'backup-staging'))).length,0);
 async function invalid(change:(b:any)=>void){const b=JSON.parse(exported.toString());change(b);await assert.rejects(()=>parseBackup(Buffer.from(JSON.stringify(b))),BackupError);}
 await invalid(b=>b.schemaVersion=2);await invalid(b=>b.versions.pop());await invalid(b=>b.currentVersion=500);await invalid(b=>b.versions[1].n=1);await invalid(b=>b.versions[0].doc.sections[0].composition='unknown');await invalid(b=>b.images=[]);await invalid(b=>b.images[0].name='../../escape.webp');await invalid(b=>b.images.push(b.images[0]));await invalid(b=>b.images[0].base64='AAAA');await invalid(b=>b.images[0].sha256='0'.repeat(64));await invalid(b=>b.sourceId='other-site');await invalid(b=>b.versions[0].doc.meta.title='a'.repeat(100));
 await assert.rejects(()=>parseBackup(Buffer.from('not json')),BackupError);await assert.rejects(()=>parseBackup(Buffer.alloc(MAX_BACKUP+1)),BackupError);
 // Структурированный payload с неизвестными служебными полями не переносит их в новый сайт.
 const malicious=JSON.parse(exported.toString());malicious.site.ownerId='attacker';malicious.site.published={slug:'takeover'};malicious.site.enquiryRecipient={email:'attacker@example.test'};
 const clean=await parseBackup(Buffer.from(JSON.stringify(malicious)));const cleanId=await restoreBackup(clean,'real-owner');assert.equal((await store.getSite(cleanId))?.ownerId,'real-owner');assert.equal((await store.getSite(cleanId))?.published,undefined);
 let release!:()=>void;const gate=new Promise<void>(r=>release=r),first=withBackupSlot(()=>gate);await assert.rejects(()=>withBackupSlot(async()=>{}),e=>e instanceof BackupError&&e.code==='busy');release();await first;await withBackupSlot(async()=>{});
 await symlink(path.join(root,'sites/original/site.json'),path.join(root,'sites/original/media','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp'));await assert.rejects(()=>exportBackup(store,site),BackupError);
 await store.deleteSite(site.id);assert.ok(await store.getVersion(restoredId,2));assert.ok(await readFile(path.join(root,'sites',restoredId,'media',file)));
 console.log('PASS: independent full saved history and image round-trip, current version and custom code, unreferenced images, owner reset, no publication/PII/jobs/pending/checks, malformed and oversized input, missing assets, path traversal, symlinks, checksums, exclusive processing, atomic staging and source independence.');
}finally{await rm(root,{recursive:true,force:true});}
