import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AiEstimateReview } from '../src/components/AiEstimateReview';
import { aiEstimateCopy } from '../src/lib/ai/estimate-copy';
import type { AiEstimate } from '../src/lib/ai/estimate-types';
const estimate: AiEstimate = { id: 'synthetic-estimate', expiresAt: Date.now()+60_000, action: 'edit', demo: false, inputLow: 10, inputHigh: 20, outputMax: 30, requestsMax: 2, includesStyle: false };
for (const locale of ['en','ru','es']) {
 const c = aiEstimateCopy(locale);
 const waiting = renderToStaticMarkup(createElement(AiEstimateReview, {estimate,locale,pending:false}));
 assert.ok(waiting.includes(c.intro));assert.ok(!waiting.includes('disabled=""'));
 const running = renderToStaticMarkup(createElement(AiEstimateReview, {estimate,locale,pending:true}));
 assert.ok(running.includes(c.running));assert.ok(!running.includes(c.intro));assert.match(running,/aria-busy="true"/);
 assert.equal((running.match(/disabled=""/g)??[]).length,2);
 const demo = renderToStaticMarkup(createElement(AiEstimateReview, {estimate:{...estimate,demo:true},locale,pending:true}));
 assert.ok(demo.includes(c.demo));assert.ok(!demo.includes(c.running));
}
console.log('PASS: EN/RU/ES estimate before execution, honest pending state, both buttons disabled, demo does not claim a real AI request. No provider calls.');
