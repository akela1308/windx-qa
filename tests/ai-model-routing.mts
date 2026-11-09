import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { creationModel, editingModel } from "../src/lib/ai/models";
import { planCreation, planEdit } from "../src/lib/ai/operation-plan";
import { costUsd } from "../src/lib/ai/pricing";
import { OpenRouterProvider } from "../src/lib/ai/openrouter";

test("creation and editing resolve separately and their planned requests name the same models", async () => {
  const previous = { ...process.env };
  try {
    process.env.AI_MODEL = "anthropic/claude-sonnet-5.5";
    delete process.env.AI_MODEL_CREATE;
    delete process.env.AI_MODEL_EDIT;
    assert.equal(creationModel(), editingModel());
    process.env.AI_MODEL_CREATE = "anthropic/claude-opus-5.5";
    assert.equal(creationModel(), "anthropic/claude-opus-5.5");
    assert.equal(editingModel(), "anthropic/claude-sonnet-5.5");
    const doc = JSON.parse(
      await readFile("docs/experiment-1c/outputs/bike/light.json", "utf8"),
    );
    const create = await planCreation("A fictional studio", undefined, "en");
    const edit = await planEdit(
      "A fictional studio",
      doc,
      "Change one word",
      "en",
      1,
      "demo",
    );
    assert.equal(create.steps[0].model, creationModel());
    assert.equal(edit.steps[0].model, editingModel());
    process.env.AI_MODEL_CREATE = "another-create-model";
    assert.notEqual(
      (await planCreation("A fictional studio", undefined, "en")).fingerprint,
      create.fingerprint,
    );
  } finally {
    process.env = previous;
  }
});

test("fallback cost uses the requested model and missing cost is explicitly estimated", async () => {
  assert.equal(costUsd(1e6, 1e6, "anthropic/claude-opus-5.5"), 24);
  assert.equal(costUsd(1e6, 1e6, "anthropic/claude-sonnet-5.5"), 12);
  const previous = globalThis.fetch;
  try {
    let requested = "";
    globalThis.fetch = async (_url, options) => {
      requested = JSON.parse(String(options?.body)).model;
      return Response.json({
        choices: [{ message: { content: "{}" } }],
        usage: { prompt_tokens: 1000, completion_tokens: 1000 },
      });
    };
    const result = await new OpenRouterProvider(
      "synthetic-key",
      "anthropic/claude-sonnet-5.5",
    ).complete({
      system: "test",
      user: "test",
      fixtureKey: "",
      model: "anthropic/claude-opus-5.5",
    });
    assert.equal(requested, "anthropic/claude-opus-5.5");
    assert.equal(result.usage.costUsd, 0.024);
    assert.equal(result.usage.estimated, true);
  } finally {
    globalThis.fetch = previous;
  }
});
