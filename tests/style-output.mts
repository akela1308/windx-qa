import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {askForDoc} from '../src/lib/sites/service';
import {getDirection,directionPrompt,validateDoc} from '../src/lib/design';
import {planCreation} from '../src/lib/ai/operation-plan';
import {issueEstimate,withAiConsent} from '../src/lib/ai/consent';
const before={...process.env},originalFetch=globalThis.fetch,root=await mkdtemp(path.join(os.tmpdir(),'windx-style-output-'));
try{
 Object.assign(process.env,{WINDX_DATA_DIR:root,OPENROUTER_API_KEY:'synthetic-test-key',AI_DEMO:'0'});
 const direction=getDirection('night-shift')!,brief='A dark contemporary bicycle workshop website, no newspaper styling.';
 const plan=await planCreation(brief,direction.id,'en');
 const wrong=JSON.parse(await readFile('docs/experiment-1c/outputs/bike/light.json','utf8'));
 const right=JSON.parse(await readFile('docs/experiment-1c/outputs/bike/dark.json','utf8'));
 assert.equal(validateDoc(wrong,direction).ok,false);assert.equal(validateDoc(right,direction).ok,true);
 let calls=0,current=wrong;
 globalThis.fetch=async()=>{calls++;return Response.json({choices:[{message:{content:JSON.stringify(current)}}],usage:{prompt_tokens:10,completion_tokens:20,cost:0}});};
 const bad=await issueEstimate('owner',plan);
 await assert.rejects(withAiConsent(bad.id,'owner',plan,()=>askForDoc(plan.system,`${brief}\n\n${directionPrompt(direction)}`,'',direction,true)),/could not be turned into a site/);
 assert.equal(calls,2,'Wrong style is retried once, then rejected rather than silently accepted');
 current=right;const good=await issueEstimate('owner',plan);
 const result=await withAiConsent(good.id,'owner',plan,()=>askForDoc(plan.system,`${brief}\n\n${directionPrompt(direction)}`,'',direction,false));
 assert.equal(validateDoc(result.result.doc,direction).ok,true);assert.equal(calls,3);
 console.log('PASS real generation validation with mocked provider: wrong chosen style is not accepted after retry; matching dark direction accepted within consent plan.');
}finally{globalThis.fetch=originalFetch;process.env=before;await rm(root,{recursive:true,force:true});}
