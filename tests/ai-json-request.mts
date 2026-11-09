import assert from "node:assert/strict";
import { OpenRouterProvider } from "../src/lib/ai/openrouter";

const originalFetch = globalThis.fetch;
const requests: Record<string, unknown>[] = [];
try {
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"reply":"Готово","ops":[{"op":"remove","index":1}]}' } }], usage: { prompt_tokens: 10, completion_tokens: 20, cost: 0 } }));
  };
  const provider = new OpenRouterProvider("synthetic-test-key", "synthetic-model");
  await provider.complete({ system: "Return JSON", user: "Edit", fixtureKey: "", jsonObject: true });
  assert.deepEqual(requests[0].response_format, { type: "json_object" });
  assert.deepEqual(requests[0].provider, { require_parameters: true });
  await provider.complete({ system: "Return JSON", user: "Create", fixtureKey: "" });
  assert.equal(requests[1].response_format, undefined);
  console.log("PASS: edit requests enforce JSON on compatible endpoints; normal requests unchanged; no network or model calls");
} finally { globalThis.fetch = originalFetch; }
