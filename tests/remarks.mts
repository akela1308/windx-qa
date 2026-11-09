import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {suggestCountry,geographyStatus} from '../src/lib/requirements/geography';
import {analyseRequirements,requirementsFingerprint} from '../src/lib/requirements/analyse';
import {emptyRequirementsInputs,RequirementsInputsSchema} from '../src/lib/requirements/types';
import {requirementsCopy} from '../src/lib/requirements/copy';
import {responseLanguagePrompt,demoCreationReply} from '../src/lib/ai/response-language';
const doc=JSON.parse(await readFile('docs/experiment-1c/outputs/bike/light.json','utf8'));
const site={id:'remarks',name:'The Lagos Cat Pantry',brief:'Cat food business in Lagos, Nigeria',facts:{},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),currentVersion:1,versionCount:1};
const version={n:1,createdAt:site.createdAt,action:'create' as const,request:site.brief,reply:'',doc,demo:true,usage:{inputTokens:0,outputTokens:0,costUsd:0,estimated:false}};
assert.equal(suggestCountry('Make a cat food website in Lagos'),null);
assert.equal(suggestCountry(site.brief)?.country,'Nigeria');
assert.equal(suggestCountry('Business in Lagos, Portugal')?.country,'Portugal');
assert.equal(suggestCountry('Nigeria and Portugal'),null);
const base={revision:randomUUID(),at:site.createdAt,inputs:{...emptyRequirementsInputs(),country:'Nigeria',customerCountries:'Nigeria',market:'other' as const}};
const ng=analyseRequirements(site,version,'draft',base);
assert.ok(ng.findings.some(f=>f.code==='outsideUk'));
assert.ok(!ng.findings.some(f=>['identity','consumerSales','privacyMissing','statistics','accessibility'].includes(f.code)));
assert.match(geographyStatus(base.inputs,'en'),/not implemented/);
assert.ok(!requirementsCopy('en').intro.includes('UK business'));
const uk={...base,inputs:{...base.inputs,country:'United Kingdom',market:'uk' as const}};
assert.notEqual(requirementsFingerprint(site,version,'draft',base),requirementsFingerprint(site,version,'draft',uk));
const missing={...uk,inputs:{...uk.inputs,country:''}};
assert.ok(!analyseRequirements(site,version,'draft',missing).findings.some(f=>['identity','consumerSales','privacyMissing'].includes(f.code)));
const old={...emptyRequirementsInputs()} as Record<string,unknown>;delete old.country;delete old.customerCountries;
assert.equal(RequirementsInputsSchema.parse(old).country,'');
for(const [locale,language] of [['en','English'],['ru','Russian'],['es','Spanish']]) {
 const prompt=await responseLanguagePrompt(locale);assert.match(prompt,new RegExp(`entire owner-facing rationale and reply in ${language}`));assert.ok(!prompt.includes('{{LANGUAGE}}'));
}
assert.ok(!/[а-яё]/i.test(demoCreationReply('en',true)));
assert.match(demoCreationReply('ru',true),/Демо/);
for(const file of ['src/lib/prompts/output-rules.md','src/lib/prompts/edit-patch.md']){const text=await readFile(file,'utf8');assert.ok(!text.includes('regardless of the cabinet language'));assert.ok(!text.includes('write it in the language of their brief'));}
console.log('PASS: explicit country suggestions only, Nigeria/unknown without UK rules, country stale fingerprint, old profile defaults, UI-scoped owner reply prompts and localized demo replies');
