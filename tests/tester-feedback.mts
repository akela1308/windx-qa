import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {creationSystem,creationUser,editingSystem,planCreation} from '../src/lib/ai/operation-plan';
import {EXAMPLE_SITES} from '../src/lib/example-sites';
import {SHOWCASE} from '../src/lib/showcase';
import {validateDoc} from '../src/lib/design';
import {renderDoc} from '../src/lib/design/render';
import {AiEstimateReview,AiUsage} from '../src/components/AiEstimateReview';
import {aiEstimateCopy} from '../src/lib/ai/estimate-copy';
import type {AiEstimate} from '../src/lib/ai/estimate-types';
const before={...process.env},fetchBefore=globalThis.fetch,root=await mkdtemp(path.join(os.tmpdir(),'windx-feedback-'));
try{
 Object.assign(process.env,{WINDX_DATA_DIR:root,OPENROUTER_API_KEY:'synthetic-key',AI_DEMO:'0'});
 const brief='UNTRUSTED_BRIEF_MARKER Dark contemporary technology studio, not newspaper style. No photographs.';
 let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Preflight must not call AI');};
 assert.equal(creationUser(brief),brief,'Automatic creation has no imposed direction or fallback');
 assert.equal(creationUser(brief,'bad'),brief,'Unknown style does not become a mandatory default');
 assert.ok(creationUser(brief,'soft-clay').startsWith(brief));assert.notEqual(creationUser(brief,'soft-clay'),brief);
 const plan=await planCreation(brief,undefined,'en');assert.equal(plan.summary.requestsMax,2);assert.equal(plan.summary.includesStyle,false);assert.equal(calls,0);assert.ok(!plan.system.includes('UNTRUSTED_BRIEF_MARKER'));
 assert.notEqual(plan.fingerprint,(await planCreation(brief,'soft-clay','en')).fingerprint);
 const system=await creationSystem('ru');assert.match(system,/Avoid compositions with required photo slots/);assert.match(system,/Do not ask for a batch of photos/);assert.ok(!system.includes('mark photo slots with a precise description of what the owner should photograph'));
 assert.ok(!(await editingSystem('ru')).includes('## First result: a finished proposal'),'Creation-only asset rules do not remove owner photos during edits');
 assert.deepEqual(Object.keys(EXAMPLE_SITES).sort(),[...SHOWCASE].sort());
 for(const [style,file]of Object.entries(EXAMPLE_SITES)){
  const checked=validateDoc(JSON.parse(await readFile(path.join('docs',file),'utf8')));assert.ok(checked.ok,style);if(checked.ok)assert.match(renderDoc(checked.doc),/<!doctype html>/i);
 }
 for(const locale of ['en','ru','es']){
  const c=aiEstimateCopy(locale);const estimate:AiEstimate={id:'local',expiresAt:Date.now()+10000,action:'create',demo:false,inputLow:100,inputHigh:200,outputMax:300,requestsMax:3,includesStyle:true};
  const html=renderToStaticMarkup(createElement(AiEstimateReview,{estimate,locale,pending:false}));
  const details=html.slice(html.indexOf('<details'),html.indexOf('</details>')+10);
  assert.ok(details.includes(c.tokens));assert.ok(!details.includes('<details open'));assert.ok(html.indexOf(c.trial)<html.indexOf('<details'));assert.ok(html.includes(c.createConfirm));assert.ok(html.includes('name="estimateId"'));
  const receipt=renderToStaticMarkup(createElement(AiUsage,{receipt:{demo:false,requests:1,unknownRequests:0,inputTokens:10,outputTokens:20,estimated:false},locale}));assert.ok(receipt.startsWith('<details'));assert.ok(!receipt.startsWith('<details open'));assert.ok(receipt.includes(c.tokens));
 }
 console.log('PASS: public sample allowlist/fixtures, customer-first collapsed usage, retained consent, first-result asset policy, isolated brief, direct automatic design and explicit style choice. AI mocked.');
}finally{globalThis.fetch=fetchBefore;process.env=before;await rm(root,{recursive:true,force:true});}
