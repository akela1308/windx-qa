// Railway run supplies live service settings to this read-only CI process.
// This is a configuration check, not an SSH session or a paid AI request.
import assert from 'node:assert/strict';
import { creationModel, editingModel } from '../src/lib/ai/models';
import { isLiveAi } from '../src/lib/ai/provider';
import { planCreation } from '../src/lib/ai/operation-plan';
assert.equal(creationModel(), 'anthropic/claude-opus-5.5');
assert.equal(editingModel(), 'anthropic/claude-sonnet-5.5');
assert.ok(isLiveAi(), 'Live AI key must be configured and demo mode disabled');
const plan = await planCreation('A fictional speaker introducing two talk topics. No supplied photos.', undefined, 'en');
assert.equal(plan.steps[0].model, creationModel());
assert.equal(plan.summary.demo, false);
console.log(JSON.stringify({verified:true, createModel:creationModel(), editModel:editingModel(), liveAi:true, planningUsesCreationModel:true, verificationAiRequests:0}, null, 2));
