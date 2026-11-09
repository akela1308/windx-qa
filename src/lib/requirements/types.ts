import { z } from "zod";
const answer = z.string().trim().max(600);
export const RequirementsInputsSchema = z
  .object({
    country: z.string().trim().max(100).default(""),
    customerCountries: z.string().trim().max(600).default(""),
    market: z.enum(["unknown", "uk", "other"]),
    entity: z.enum(["unknown", "sole", "limited", "llp", "other"]),
    legalName: answer,
    number: z.string().trim().max(40),
    office: answer,
    registeredIn: answer,
    sales: z.enum(["unknown", "no", "consumer", "business", "mixed"]),
    tracking: z.enum([
      "unknown",
      "none",
      "essential",
      "statistics",
      "advertising",
      "other",
    ]),
    extraData: z.enum(["unknown", "no", "yes"]),
    special: z.enum([
      "unknown",
      "ordinary",
      "regulated",
      "sensitive",
      "children",
      "public",
      "mixed",
    ]),
    vendors: answer,
    purpose: answer,
    basis: answer,
    retention: answer,
    privacyContact: answer,
    sharing: answer,
    transfers: answer,
  })
  .strict();
export type RequirementsInputs = z.infer<typeof RequirementsInputsSchema>;
export const emptyRequirementsInputs = (): RequirementsInputs => ({
  country: "",
  customerCountries: "",
  market: "unknown",
  entity: "unknown",
  legalName: "",
  number: "",
  office: "",
  registeredIn: "",
  sales: "unknown",
  tracking: "unknown",
  extraData: "unknown",
  special: "unknown",
  vendors: "",
  purpose: "",
  basis: "",
  retention: "",
  privacyContact: "",
  sharing: "",
  transfers: "",
});
export type RequirementsProfile = {
  revision: string;
  at: string;
  inputs: RequirementsInputs;
};
export type RequirementsTarget = "draft" | "published";
export type RequirementsCode =
  | "market"
  | "outsideUk"
  | "entity"
  | "identity"
  | "businessDetails"
  | "placement"
  | "privacyMissing"
  | "privacyReview"
  | "privacyFacts"
  | "recipient"
  | "retention"
  | "trackingInventory"
  | "advertising"
  | "statistics"
  | "trackingReview"
  | "customCode"
  | "fonts"
  | "salesScope"
  | "consumerSales"
  | "businessSales"
  | "specialScope"
  | "specialist"
  | "facts"
  | "accessibility";
export type RequirementsSource = {
  locationHint?: { country: string; evidence: string } | null;
  key: string;
  title: string;
  url: string;
  checkedAt: string;
};
export type RequirementsFinding = {
  code: RequirementsCode;
  section?: number;
  evidence: string;
  priority: "high" | "medium" | "low";
  confidence: "observed" | "declared" | "possible";
  action: "owner" | "review" | "specialist";
  source: "document" | "profile" | "platform";
  reference: string;
};
export type DataFlow = {
  kind: "hosting" | "form" | "fonts" | "code" | "contact" | "extra";
  section?: number;
  fields: string[];
  destination: "inbox" | "googleFonts" | "hosting" | "external" | "owner";
  details: string;
  confidence: "observed" | "declared" | "possible";
};
export type RequirementsReport = {
  id: string;
  at: string;
  target: RequirementsTarget;
  version: number;
  fingerprint: string;
  profileRevision: string | null;
  profileAt: string | null;
  inputs: RequirementsInputs;
  rulesVersion: string;
  sources: RequirementsSource[];
  findings: RequirementsFinding[];
  flows: DataFlow[];
  formSections: number[];
  privacySections: number[];
  privacyLinks: { section: number; href: string }[];
  customCode: boolean;
  limited: boolean;
  sourcesDue: boolean;
};
export type RequirementsCheckState = {
  locationHint?: { country: string; evidence: string } | null;
  key: string;
  draft: string;
  published: string | null;
  profile: RequirementsProfile | null;
  reports: RequirementsReport[];
  form: boolean;
  code: boolean;
};
