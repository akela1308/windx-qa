// Bounded isolated evaluation. No publication, deployment or account/site writes.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  planCreation,
  creationUser,
  type OperationPlan,
} from "../../src/lib/ai/operation-plan";
import { designReferenceContext } from "../../src/lib/design/references";
import {
  creationAssetsContext,
  type CreationAsset,
} from "../../src/lib/design/visual-plan";
import { askForDoc } from "../../src/lib/sites/service";
import { issueEstimate, withAiConsent } from "../../src/lib/ai/consent";
import { DEFAULT_MODEL } from "../../src/lib/ai/openrouter";
import { mediaRefs } from "../../src/lib/media/refs";

if (!process.env.OPENROUTER_API_KEY)
  throw Error(
    "A live OpenRouter key is required. This evaluation never substitutes fixtures for model results.",
  );
const out = path.resolve(
  process.argv[2] ?? "data/verification/reference-design-2026-11-06",
);
await mkdir(out, { recursive: true });
process.env.WINDX_DATA_DIR = path.join(out, ".runtime");
process.env.AI_DEMO = "0";
const currentModel = process.env.AI_MODEL ?? DEFAULT_MODEL;
const opusModel = "anthropic/claude-opus-5.5";
const allCases = JSON.parse(
  await readFile("experiments/reference-design/cases.json", "utf8"),
) as {
  id: string;
  name: string;
  brief: string;
  assets: (CreationAsset & { file: string })[];
}[];
const cases = process.argv[3]
  ? allCases.filter((c) => c.id === process.argv[3])
  : allCases;
if (!cases.length) throw Error("Unknown evaluation case");
const suffix =
  "This is an unpublished design demonstration of a fictional business. Explain the design and visualPlan in Russian. Keep visitor copy in British English. No third-party contact, publication or real orders. Do not put photo-upload instructions or missing-material homework on the page.";
const baseline = await readFile(
  "experiments/reference-design/baseline/system.md",
  "utf8",
);
const results: Record<string, unknown>[] = [];
let spent = 0;
const manifest = {
  startedAt: new Date().toISOString(),
  baselineCommit: "c34d81a",
  currentModel,
  opusModel,
  requestLimit: cases.length * 6,
  budgetStopUsd: 10,
  cases: cases.map((c) => ({ id: c.id, brief: c.brief, assets: c.assets })),
  results,
};
await writeFile(
  path.join(out, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);
for (const c of cases)
  for (const variant of ["before", "after", "opus"] as const) {
    const file = path.join(out, `${c.id}-${variant}.json`);
    // Never re-run a billed result accidentally. Use a new output folder for a new trial.
    try {
      await readFile(file);
      throw Error("Result already exists: " + file);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    if (spent >= 10) throw Error("Evaluation budget stop reached");
    const model = variant === "opus" ? opusModel : currentModel;
    process.env.AI_MODEL = model;
    process.env.AI_MODEL_CREATE = model;
    const brief = c.brief + "\n\n" + suffix;
    const assets = c.assets.map(({ src, subject, role, framing }) => ({
      src,
      subject,
      role,
      framing,
    }));
    let plan = await planCreation(brief, undefined, "ru", undefined, assets);
    if (variant === "before") {
      const user =
        creationUser(brief) +
        designReferenceContext(brief) +
        creationAssetsContext(assets);
      const steps = plan.steps.map((step) => ({
        ...step,
        inputBytes: Math.max(
          step.inputBytes,
          Buffer.byteLength(baseline + user) + 17024,
        ),
      }));
      plan = {
        ...plan,
        system: baseline,
        user,
        steps,
        fingerprint: createHash("sha256")
          .update(
            JSON.stringify({ system: baseline, user, steps, variant, model }),
          )
          .digest("hex"),
      } satisfies OperationPlan;
    }
    const quote = await issueEstimate("design-evaluation", plan);
    const start = Date.now();
    const execution = await withAiConsent(
      quote.id,
      "design-evaluation",
      plan,
      () => askForDoc(plan.system, plan.user!, "", undefined, true, assets),
    );
    const result = execution.result;
    if (mediaRefs(result.doc).some((src) => !assets.some((a) => a.src === src)))
      throw Error("Evaluation output contains an unavailable image");
    spent += result.usage.costUsd;
    await writeFile(file, JSON.stringify(result.doc, null, 2) + "\n");
    const row = {
      caseId: c.id,
      variant,
      model,
      seconds: Math.round((Date.now() - start) / 1000),
      usage: result.usage,
      receipt: execution.receipt,
      hero: result.doc.sections.find((s) => s.composition.startsWith("hero."))
        ?.composition,
      sequence: result.doc.sections
        .filter(
          (s) =>
            !s.composition.startsWith("header.") &&
            !s.composition.startsWith("footer.") &&
            !s.composition.startsWith("signature."),
        )
        .map((s) => s.composition),
      images: mediaRefs(result.doc).length,
      imagePlan: result.doc.visualPlan?.images ?? null,
    };
    results.push(row);
    await writeFile(
      path.join(out, "manifest.json"),
      JSON.stringify(
        {
          ...manifest,
          spentUsd: spent,
          finishedAt:
            results.length === cases.length * 3
              ? new Date().toISOString()
              : null,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      JSON.stringify({
        case: c.id,
        variant,
        model,
        seconds: row.seconds,
        usd: result.usage.costUsd,
        spentUsd: spent,
        hero: row.hero,
        requests: execution.receipt.requests,
      }),
    );
  }
