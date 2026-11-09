import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  analyseRequirements,
  requirementsFingerprint,
} from "../src/lib/requirements/analyse";
import { requirementsDocument } from "../src/lib/requirements/document";
import {
  RequirementsInputsSchema,
  emptyRequirementsInputs,
  type RequirementsProfile,
} from "../src/lib/requirements/types";
import { requirementsQuestions } from "../src/lib/requirements/questions";
import {
  requirementsCopy,
  requirementsFindingCopy,
  requirementsQuestionCopy,
} from "../src/lib/requirements/copy";
import {
  RequirementsConflict,
  RequirementsLimit,
} from "../src/lib/requirements/files";
import { FileSiteStore } from "../src/lib/storage/file-store";
import { OwnedSiteStore } from "../src/lib/storage/owned-store";
import { SiteDocSchema } from "../experiments/exp1/a/schema";
import { renderDoc } from "../src/lib/design/render";
import type { Site, SiteVersion } from "../src/lib/storage/types";
const root = await mkdtemp(path.join(os.tmpdir(), "windx-requirements-"));
process.env.WINDX_DATA_DIR = root;
try {
  const doc = SiteDocSchema.parse(
    JSON.parse(
      await readFile("docs/experiment-1c/outputs/bike/light.json", "utf8"),
    ),
  );
  doc.factsToConfirm = [];
  const site: Site = {
    id: "requirements-one",
    ownerId: "owner",
    name: "Test",
    brief: "Private",
    createdAt: "now",
    updatedAt: "now",
    currentVersion: 1,
    versionCount: 1,
    facts: {},
  };
  const version = { n: 1, doc } as SiteVersion;
  const initial = analyseRequirements(site, version, "draft", null);
  assert.ok(initial.findings.some((f) => f.code === "market"));
  assert.ok(
    !initial.findings.some((f) =>
      ["identity", "consumerSales", "advertising", "privacyMissing"].includes(
        f.code,
      ),
    ),
  );
  assert.deepEqual(
    requirementsQuestions(emptyRequirementsInputs(), false, false),
    ["country", "customerCountries", "market"],
  );
  const input = {
    ...emptyRequirementsInputs(),
    country: "United Kingdom",
    market: "uk" as const,
    entity: "limited" as const,
    tracking: "none" as const,
    sales: "no" as const,
    special: "ordinary" as const,
    extraData: "no" as const,
  };
  const profile: RequirementsProfile = {
    revision: randomUUID(),
    at: new Date().toISOString(),
    inputs: input,
  };
  let report = analyseRequirements(site, version, "draft", profile);
  assert.ok(report.findings.some((f) => f.code === "identity"));
  assert.ok(report.findings.some((f) => f.code === "privacyMissing"));
  assert.ok(
    !report.findings.some((f) =>
      ["advertising", "statistics", "trackingReview", "consumerSales"].includes(
        f.code,
      ),
    ),
  );
  assert.ok(report.flows.some((f) => f.kind === "fonts"));
  assert.match(renderDoc(doc), /fonts\.googleapis\.com/);
  const questions = requirementsQuestions(input, false, false);
  assert.ok(questions.includes("number") && !questions.includes("basis"));
  assert.ok(
    !requirementsQuestions({ ...input, entity: "sole" }, false, false).includes(
      "number",
    ),
  );
  assert.ok(requirementsQuestions(input, true, false).includes("basis"));
  assert.ok(
    requirementsQuestions(
      { ...input, tracking: "statistics" },
      false,
      false,
    ).includes("vendors"),
  );
  const llp = analyseRequirements(site, version, "draft", {
    ...profile,
    inputs: { ...input, entity: "llp" },
  });
  assert.equal(
    llp.findings.find((f) => f.code === "identity")?.reference,
    "llp",
  );
  const outside = analyseRequirements(site, version, "draft", {
    ...profile,
    inputs: { ...input, market: "other" },
  });
  assert.ok(outside.findings.some((f) => f.code === "outsideUk"));
  assert.ok(
    !outside.findings.some((f) =>
      ["identity", "privacyMissing", "statistics", "accessibility"].includes(
        f.code,
      ),
    ),
  );
  const forms = structuredClone(doc);
  forms.sections.push(
    {
      id: "form-one",
      composition: "contact.form",
      tone: "default",
      props: { title: "Ask", submitLabel: "Send" },
    },
    {
      id: "form-two",
      composition: "contact.form-inline",
      tone: "default",
      props: { title: "Quick ask", submitLabel: "Send" },
    },
  );
  const withForms = { ...version, doc: SiteDocSchema.parse(forms) };
  report = analyseRequirements(site, withForms, "draft", profile);
  assert.equal(report.formSections.length, 2);
  assert.ok(report.findings.some((f) => f.code === "privacyFacts"));
  assert.ok(report.findings.some((f) => f.code === "retention"));
  assert.ok(report.findings.some((f) => f.code === "recipient"));
  const flows = report.flows.filter((f) => f.kind === "form");
  assert.ok(flows[0].fields.includes("name"));
  assert.ok(!flows[1].fields.includes("name"));
  const filled = {
    ...profile,
    inputs: {
      ...input,
      legalName: "Real Company Ltd",
      number: "12345678",
      office: "1 Real Street",
      registeredIn: "England and Wales",
      purpose: "Answer enquiries",
      basis: "Owner decision still requires review",
      retention: "Manual review each month",
      privacyContact: "owner@example.test",
      sharing: "Owner and WINDX hosting",
      transfers: "Not verified, seek advice",
    },
  };
  const ready = analyseRequirements(
    {
      ...site,
      enquiryRecipient: { email: "owner@example.test", confirmedAt: "now" },
    },
    withForms,
    "draft",
    filled,
  );
  assert.ok(
    !ready.findings.some(
      (f) =>
        f.code === "privacyFacts" ||
        f.code === "identity" ||
        f.code === "recipient",
    ),
  );
  assert.ok(ready.findings.some((f) => f.code === "retention"));
  assert.ok(ready.findings.some((f) => f.code === "placement"));
  for (const tracking of [
    "statistics",
    "advertising",
    "essential",
    "other",
  ] as const) {
    const r = analyseRequirements(site, version, "draft", {
      ...profile,
      inputs: { ...input, tracking },
    });
    assert.ok(
      r.findings.some(
        (f) =>
          f.code ===
          (tracking === "statistics"
            ? "statistics"
            : tracking === "advertising"
              ? "advertising"
              : "trackingReview"),
      ),
    );
  }
  for (const special of [
    "regulated",
    "children",
    "sensitive",
    "public",
    "mixed",
  ] as const) {
    const r = analyseRequirements(site, version, "draft", {
      ...profile,
      inputs: { ...input, special },
    });
    assert.ok(r.findings.some((f) => f.code === "specialist"));
    assert.ok(
      r.sources.every(
        (s) => s.url.startsWith("https://") && s.checkedAt === "2026-10-30",
      ),
    );
  }
  assert.ok(
    analyseRequirements(site, version, "draft", {
      ...profile,
      inputs: { ...input, sales: "consumer" },
    }).findings.some((f) => f.code === "consumerSales"),
  );
  const embed = structuredClone(doc);
  embed.sections.push({
    composition: "embed.code",
    tone: "default",
    props: {
      title: "Widget",
      html: '<h2>Privacy</h2><p>private fake privacy text</p><script>fetch("https://never.example")</script>',
      css: "",
      js: 'throw Error("never execute")',
    },
  } as never);
  const embedReport = analyseRequirements(
    site,
    { ...version, doc: embed },
    "draft",
    profile,
  );
  assert.ok(embedReport.findings.some((f) => f.code === "customCode"));
  assert.equal(embedReport.privacySections.length, 0);
  const candidate = structuredClone(doc);
  candidate.sections[1] = {
    ...candidate.sections[1],
    id: "privacy",
    props: {
      title: "Privacy notice",
      body: "An incomplete notice is only a candidate, never a certificate. We retain information for a time.",
    },
  } as never;
  const candidateReport = analyseRequirements(
    site,
    { ...version, doc: candidate },
    "draft",
    profile,
  );
  assert.ok(candidateReport.findings.some((f) => f.code === "privacyReview"));
  assert.ok(!candidateReport.findings.some((f) => f.code === "privacyMissing"));
  const bounded = structuredClone(candidate);
  (bounded.sections[1].props as Record<string, unknown>).body = "x".repeat(
    9000,
  );
  assert.equal(requirementsDocument(bounded).limited, true);
  const far = analyseRequirements(
    site,
    version,
    "draft",
    profile,
    new Date("2027-03-01T12:00:00Z"),
  );
  assert.equal(far.sourcesDue, true);
  assert.notEqual(
    requirementsFingerprint(site, version, "draft", profile),
    requirementsFingerprint(site, version, "published", profile),
  );
  assert.notEqual(
    requirementsFingerprint(site, version, "draft", profile),
    requirementsFingerprint(site, version, "draft", filled),
  );
  assert.equal(
    RequirementsInputsSchema.safeParse({ ...input, number: "a".repeat(41) })
      .success,
    false,
  );
  assert.equal(
    RequirementsInputsSchema.safeParse({ ...input, extra: "ignore me" })
      .success,
    false,
  );
  const raw = new FileSiteStore(root);
  await raw.saveSite(site);
  await raw.addVersion(site.id, version);
  const owner = new OwnedSiteStore(raw, "owner"),
    foreign = new OwnedSiteStore(raw, "foreign"),
    anon = new OwnedSiteStore(raw, null);
  for (const store of [foreign, anon]) {
    await assert.rejects(() => store.getRequirementsProfile(site.id));
    await assert.rejects(() => store.listRequirementsReports(site.id));
    await assert.rejects(() =>
      store.saveRequirementsProfile(site.id, input, null),
    );
    await assert.rejects(() => store.saveRequirementsReport(site.id, report));
  }
  const saved = await owner.saveRequirementsProfile(site.id, input, null);
  assert.equal(
    (await owner.getRequirementsProfile(site.id))?.revision,
    saved.revision,
  );
  await assert.rejects(
    () => owner.saveRequirementsProfile(site.id, input, null),
    RequirementsConflict,
  );
  const attempts = await Promise.allSettled([
    owner.saveRequirementsProfile(site.id, input, saved.revision),
    owner.saveRequirementsProfile(site.id, input, saved.revision),
  ]);
  assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
  const current = await owner.getRequirementsProfile(site.id);
  const stored = analyseRequirements(site, version, "draft", current);
  await owner.saveRequirementsReport(site.id, stored);
  assert.equal((await owner.listRequirementsReports(site.id))[0].id, stored.id);
  const dir = path.join(root, "sites", site.id, "checks", "requirements");
  assert.equal(
    (await stat(path.join(dir, "profile.json"))).mode & 0o777,
    0o600,
  );
  assert.equal(
    (
      await stat(
        path.join(
          dir,
          (await readdir(dir)).find((f) => f.endsWith(`${stored.id}.json`))!,
        ),
      )
    ).mode & 0o777,
    0o600,
  );
  const writes = await Promise.allSettled(
    Array.from({ length: 35 }, () =>
      owner.saveRequirementsReport(
        site.id,
        analyseRequirements(site, version, "draft", current),
      ),
    ),
  );
  assert.equal(writes.filter((r) => r.status === "fulfilled").length, 29);
  assert.ok(
    writes.some(
      (r) => r.status === "rejected" && r.reason instanceof RequirementsLimit,
    ),
  );
  assert.equal((await owner.listRequirementsReports(site.id)).length, 10);
  await assert.rejects(
    () =>
      owner.saveRequirementsReport(site.id, {
        ...stored,
        profileRevision: randomUUID(),
      }),
    RequirementsConflict,
  );
  const guest = new OwnedSiteStore(raw, "owner", true);
  await guest.saveRequirementsProfile(site.id, input, current!.revision);
  await raw.saveSite({
    ...site,
    published: { slug: "requirements-one", at: "now", version: 1 },
  });
  await assert.rejects(async () =>
    guest.saveRequirementsProfile(
      site.id,
      input,
      (await raw.getRequirementsProfile(site.id))!.revision,
    ),
  );
  await assert.rejects(() => guest.saveRequirementsReport(site.id, stored));
  for (const locale of ["en", "ru", "es"]) {
    assert.ok(requirementsCopy(locale).limits);
    for (const f of report.findings)
      assert.ok(requirementsFindingCopy(locale, f.code).every(Boolean));
    for (const key of requirementsQuestions(input, true, true))
      assert.ok(requirementsQuestionCopy(locale, key)[0]);
  }
  console.log(
    "PASS: conditional UK scope, progressive questions, company/LLP identity, privacy candidates without legal approval, both form data maps, no automatic cookie banner, statistics/advertising distinctions, special contexts, bounded content, fingerprints, private history, optimistic answer conflicts, permissions and concurrent rate limit",
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
