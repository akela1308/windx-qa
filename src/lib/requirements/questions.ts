import type { RequirementsInputs } from "./types";
export type RequirementsQuestion = keyof RequirementsInputs;
export function requirementsQuestions(
  inputs: RequirementsInputs,
  form: boolean,
  code: boolean,
): RequirementsQuestion[] {
  const keys: RequirementsQuestion[] = ["country", "customerCountries", "market"];
  if (inputs.market !== "uk") return keys;
  keys.push("entity");
  if (inputs.entity !== "unknown") keys.push("legalName");
  if (inputs.entity === "limited" || inputs.entity === "llp")
    keys.push("number", "office", "registeredIn");
  keys.push("sales", "tracking");
  if (code || !["none", "unknown"].includes(inputs.tracking))
    keys.push("vendors");
  keys.push("extraData", "special");
  if (form || inputs.extraData === "yes")
    keys.push(
      "purpose",
      "basis",
      "retention",
      "privacyContact",
      "sharing",
      "transfers",
    );
  return keys;
}
export const requirementsChoices: Partial<
  Record<RequirementsQuestion, string[]>
> = {
  market: ["unknown", "uk", "other"],
  entity: ["unknown", "sole", "limited", "llp", "other"],
  sales: ["unknown", "no", "consumer", "business", "mixed"],
  tracking: [
    "unknown",
    "none",
    "essential",
    "statistics",
    "advertising",
    "other",
  ],
  extraData: ["unknown", "no", "yes"],
  special: [
    "unknown",
    "ordinary",
    "regulated",
    "sensitive",
    "children",
    "public",
    "mixed",
  ],
};
