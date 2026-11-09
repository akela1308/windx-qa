import { DEFAULT_MODEL } from "./openrouter";

// Creation may use a stronger model without making every text edit cost the same.
// Both planning and execution resolve through this file, so consent stays exact.
export const creationModel = () =>
  process.env.AI_MODEL_CREATE || process.env.AI_MODEL || DEFAULT_MODEL;
export const editingModel = () =>
  process.env.AI_MODEL_EDIT || process.env.AI_MODEL || DEFAULT_MODEL;
