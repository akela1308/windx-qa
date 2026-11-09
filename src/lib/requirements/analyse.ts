import { createHash, randomUUID } from "node:crypto";
import type { Site, SiteVersion } from "@/lib/storage/types";
import { requirementsDocument } from "./document";
import {
  REQUIREMENTS_CHECKED_AT,
  REQUIREMENTS_RULES_VERSION,
  REQUIREMENTS_SOURCES,
} from "./sources";
import {
  emptyRequirementsInputs,
  type RequirementsProfile,
  type RequirementsTarget,
  type RequirementsReport,
  type RequirementsFinding,
  type RequirementsCode,
  type DataFlow,
} from "./types";
export function requirementsFingerprint(
  site: Site,
  version: SiteVersion,
  target: RequirementsTarget,
  profile: RequirementsProfile | null,
) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        REQUIREMENTS_RULES_VERSION,
        target,
        version.n,
        version.doc,
        site.facts,
        site.enquiryRecipient ?? null,
        site.enquiryNotifications ?? null,
        site.published ?? null,
        profile,
      ]),
    )
    .digest("hex");
}
export function analyseRequirements(
  site: Site,
  version: SiteVersion,
  target: RequirementsTarget,
  profile: RequirementsProfile | null,
  now = new Date(),
): RequirementsReport {
  const inputs = profile?.inputs ?? emptyRequirementsInputs(),
    doc = requirementsDocument(version.doc);
  const findings: RequirementsFinding[] = [],
    flows: DataFlow[] = [];
  function add(
    code: RequirementsCode,
    reference: string,
    options: Partial<Omit<RequirementsFinding, "code" | "reference">> = {},
  ) {
    findings.push({
      code,
      reference,
      priority: "medium",
      confidence: "possible",
      action: "owner",
      source: "profile",
      evidence: "",
      ...options,
    });
  }
  flows.push({
    kind: "hosting",
    fields: ["ip", "request"],
    destination: "hosting",
    details: "WINDX / Railway",
    confidence: "observed",
  });
  flows.push({
    kind: "fonts",
    fields: ["ip", "request"],
    destination: "googleFonts",
    details: "fonts.googleapis.com, fonts.gstatic.com",
    confidence: "observed",
  });
  for (const section of doc.forms) {
    const full = version.doc.sections[section].composition === "contact.form";
    flows.push({
      kind: "form",
      section,
      fields: [
        ...(full ? ["name"] : []),
        "contact",
        "message",
        "time",
        "version",
      ],
      destination: "inbox",
      details: site.enquiryRecipient?.confirmedAt
        ? site.enquiryRecipient.email
        : "",
      confidence: "observed",
    });
  }
  if (doc.forms.length && site.enquiryNotifications?.enabled) flows.push({
    kind: "extra", fields: ["ownerEmail", "siteName", "inboxLink"], destination: "external",
    details: `WINDX → Resend → ${site.enquiryNotifications.email}`, confidence: "observed",
  });
  for (const section of doc.codes)
    flows.push({
      kind: "code",
      section,
      fields: ["unknown"],
      destination: "external",
      details: "",
      confidence: "possible",
    });
  if (doc.contact)
    flows.push({
      kind: "contact",
      fields: ["contact", "message"],
      destination: "owner",
      details: "",
      confidence: "possible",
    });
  if (inputs.extraData === "yes")
    flows.push({
      kind: "extra",
      fields: ["unknown"],
      destination: "external",
      details: inputs.sharing,
      confidence: "declared",
    });

  if (!inputs.country?.trim() || inputs.market === "unknown") add("market", "privacy");
  if (inputs.market === "other")
    add("outsideUk", "privacy", {
      action: "specialist",
      confidence: "declared",
      evidence: "other",
    });
  const uk = !!inputs.country?.trim() && inputs.market === "uk";
  if (uk) {
    if (inputs.entity === "unknown") add("entity", "business");
    else {
      const company = inputs.entity === "limited" || inputs.entity === "llp";
      const keys = company
        ? (["legalName", "number", "office", "registeredIn"] as const)
        : (["legalName"] as const);
      const missing = keys.filter((key) => !inputs[key]);
      if (missing.length)
        add(
          "identity",
          inputs.entity === "limited"
            ? "company"
            : inputs.entity === "llp"
              ? "llp"
              : "business",
          { evidence: missing.join(", "), confidence: "observed" },
        );
      const normal = (v: string) =>
        v.toLocaleLowerCase("en-GB").replace(/[^\p{L}\p{N}]/gu, "");
      const absent = keys.filter(
        (key) => inputs[key] && !normal(doc.text).includes(normal(inputs[key])),
      );
      if (absent.length)
        add(
          "placement",
          inputs.entity === "limited"
            ? "company"
            : inputs.entity === "llp"
              ? "llp"
              : "business",
          { evidence: absent.join(", "), source: "document", action: "review" },
        );
    }
    add("businessDetails", "provider", {
      action: "specialist",
      priority: "low",
    });
    if (inputs.sales === "unknown") add("salesScope", "sales");
    else if (["consumer", "mixed"].includes(inputs.sales))
      add("consumerSales", "consumer", {
        confidence: "declared",
        action: "specialist",
        evidence: inputs.sales,
        priority: "high",
      });
    else if (inputs.sales === "business")
      add("businessSales", "sales", {
        confidence: "declared",
        action: "specialist",
        priority: "low",
      });
    if (inputs.special === "unknown")
      add("specialScope", "accessibility", { priority: "low" });
    else if (inputs.special !== "ordinary")
      add(
        "specialist",
        inputs.special === "children"
          ? "children"
          : inputs.special === "sensitive"
            ? "sensitive"
            : inputs.special === "regulated"
              ? "regulated"
              : inputs.special === "mixed"
                ? "privacy"
                : "accessibility",
        {
          confidence: "declared",
          action: "specialist",
          evidence: inputs.special,
          priority: "high",
        },
      );
    add("accessibility", "accessibility", {
      action: "specialist",
      priority: "low",
      source: "platform",
    });
  }
  // Не распространяем британские правовые выводы на неизвестный/другой рынок.
  // Карта фактических функций остаётся доступной при любом ответе.
  if (uk) {
    const personal = doc.forms.length > 0 || inputs.extraData === "yes";
    const privacyReady =
      !!inputs.legalName &&
      (
        [
          "purpose",
          "basis",
          "retention",
          "privacyContact",
          "sharing",
          "transfers",
        ] as const
      ).every((key) => !!inputs[key]);
    if (!doc.privacySections.length && !doc.privacyLinks.length)
      add("privacyMissing", "location", {
        source: "document",
        action: privacyReady ? "review" : personal ? "owner" : "specialist",
        section: doc.forms[0],
        priority: personal ? "high" : "medium",
      });
    else
      add("privacyReview", "privacy", {
        source: "document",
        action: "specialist",
        section: doc.privacySections[0] ?? doc.privacyLinks[0]?.section,
        evidence: doc.privacyLinks
          .map((v) => v.href)
          .join("\n")
          .slice(0, 800),
      });
    if (personal) {
      const missing = (
        [
          "purpose",
          "basis",
          "retention",
          "privacyContact",
          "sharing",
          "transfers",
        ] as const
      ).filter((key) => !inputs[key]);
      if (missing.length)
        add("privacyFacts", "privacy", {
          evidence: missing.join(", "),
          priority: "high",
          confidence: "observed",
        });
    }
    if (inputs.extraData === "unknown")
      add("privacyFacts", "privacy", { evidence: "extraData" });
    if (inputs.tracking === "unknown") add("trackingInventory", "cookies");
    else if (inputs.tracking === "advertising")
      add("advertising", "consent", {
        confidence: "declared",
        action: "specialist",
        priority: "high",
      });
    else if (inputs.tracking === "statistics")
      add("statistics", "cookies", {
        confidence: "declared",
        action: "specialist",
      });
    else if (inputs.tracking === "other" || inputs.tracking === "essential")
      add("trackingReview", "cookies", {
        confidence: "declared",
        action: "specialist",
        priority: inputs.tracking === "essential" ? "low" : "medium",
      });
    // «Нет» от владельца не является результатом динамического cookie-аудита.
    add("fonts", "privacy", {
      source: "platform",
      action: "specialist",
      priority: "low",
      confidence: "observed",
      evidence: "fonts.googleapis.com, fonts.gstatic.com",
    });
  }
  if (doc.forms.length) {
    if (!site.enquiryRecipient?.confirmedAt)
      add("recipient", "privacy", {
        source: "document",
        confidence: "observed",
        section: doc.forms[0],
        priority: "high",
      });
    if (uk)
      add("retention", "privacy", {
        source: "platform",
        action: "owner",
        section: doc.forms[0],
        evidence: inputs.retention,
        priority: inputs.retention ? "medium" : "low",
      });
  }
  if (doc.codes.length)
    add("customCode", "cookies", {
      source: "document",
      confidence: "observed",
      action: "specialist",
      section: doc.codes[0],
      evidence: inputs.vendors,
    });
  const unconfirmed = version.doc.factsToConfirm.filter(
    (f) => site.facts[f.fact] !== "confirmed",
  );
  if (unconfirmed.length)
    add("facts", "privacy", {
      source: "document",
      confidence: "observed",
      evidence: String(unconfirmed.length),
      priority: "high",
    });
  findings.sort(
    (a, b) =>
      ["high", "medium", "low"].indexOf(a.priority) -
      ["high", "medium", "low"].indexOf(b.priority),
  );
  const keys = [...new Set(findings.map((f) => f.reference))];
  return {
    id: randomUUID(),
    at: now.toISOString(),
    target,
    version: version.n,
    fingerprint: requirementsFingerprint(site, version, target, profile),
    profileRevision: profile?.revision ?? null,
    profileAt: profile?.at ?? null,
    inputs,
    rulesVersion: REQUIREMENTS_RULES_VERSION,
    sources: keys.map((key) => ({ ...REQUIREMENTS_SOURCES[key] })),
    findings,
    flows,
    formSections: doc.forms,
    privacySections: doc.privacySections,
    privacyLinks: doc.privacyLinks,
    customCode: !!doc.codes.length,
    limited: doc.limited,
    sourcesDue:
      now.getTime() - Date.parse(REQUIREMENTS_CHECKED_AT) > 90 * 86400_000,
  };
}
