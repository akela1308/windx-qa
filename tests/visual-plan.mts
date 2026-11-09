import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { SiteDocSchema } from "../experiments/exp1/a/schema";
import { renderDoc } from "../src/lib/design/render";
import {
  creationVisualErrors,
  imageGuidance,
  creationAssetsContext,
  fitCreationImages,
} from "../src/lib/design/visual-plan";
import { contentSections } from "../src/lib/content/fields";
import { applyPatch } from "../src/lib/sites/patch";
import { ImagePlan } from "../src/components/editor/ImagePlan";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { askForDoc } from "../src/lib/sites/service";
import { planCreation } from "../src/lib/ai/operation-plan";
import { issueEstimate, withAiConsent } from "../src/lib/ai/consent";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const src = "/media/demo-speaker/11111111-1111-4111-8111-111111111111.webp";
const original = JSON.parse(
  await readFile("docs/experiment-1c/outputs/bike/light.json", "utf8"),
);
const image = {
  sectionId: "intro",
  role: "person" as const,
  source: "owner" as const,
  subject: "Портрет спикера",
  purpose: "Представить человека",
  framing: "portrait" as const,
  placement: "Слева от текста, на телефоне после кнопки",
  focalPoint: "Голова и плечи",
};
const make = (composition = "hero.portrait-intro") =>
  SiteDocSchema.parse({
    ...original,
    visualPlan: {
      intent: "PRIVATE_PLAN_ONLY",
      layout: "Introduce a person before the talk list",
      references: [],
      images: [image],
    },
    sections: [
      {
        composition: "header.inline",
        id: "header",
        tone: "default",
        props: { name: "DEMO ONLY Speaker", links: [] },
      },
      {
        composition,
        id: "intro",
        tone: "default",
        props: {
          headline: "Ideas for working teams",
          sub: "A fictional speaker for this design demonstration.",
          cta: { label: "Read the talks", href: "#talks" },
          photo: {
            src,
            subject: "Fictional demo portrait",
            positionX: 50,
            positionY: 35,
          },
          facts: ["20 to 60 minutes"],
          framing: "wide",
        },
      },
      {
        composition: "services.disclosure",
        id: "talks",
        tone: "default",
        props: {
          title: "Talks",
          items: [
            {
              name: "Team decisions",
              description: "How teams choose a next step.",
            },
            {
              name: "Working through uncertainty",
              description:
                "A discussion of decisions with incomplete information.",
            },
          ],
        },
      },
      {
        composition: "footer.simple",
        id: "end",
        tone: "default",
        props: {
          name: "DEMO ONLY Speaker",
          lines: ["Unpublished design demonstration"],
          links: [],
        },
      },
    ],
  });

test("new photo compositions render real images, retain editing controls and hide the private plan", () => {
  for (const name of ["hero.portrait-intro", "hero.image-led"]) {
    const doc = make(name);
    assert.deepEqual(creationVisualErrors(doc, [src]), []);
    const html = renderDoc(doc);
    assert.ok(html.includes(src));
    assert.ok(!html.includes("Photo:"));
    assert.ok(!html.includes("PRIVATE_PLAN_ONLY"));
    const fields = contentSections(doc)[2].fields;
    assert.ok(
      fields.some(
        (f) => f.kind === "photo" && f.path === "photo" && f.required,
      ),
    );
    assert.ok(
      !fields.some((f) => f.path === "framing"),
      "Layout enum is not an ordinary text field",
    );
  }
});

test("plans cannot claim missing images, invent paths, lose section linkage or cite unavailable references", () => {
  const doc = make();
  assert.ok(
    creationVisualErrors(doc).some((e) => e.includes("invent /media/")),
  );
  const noImage = structuredClone(doc);
  delete (noImage.sections[1].props as { photo: { src?: string } }).photo.src;
  assert.ok(
    creationVisualErrors(noImage).some((e) => e.includes("empty photo frame")),
  );
  const missingPlan = structuredClone(doc);
  delete missingPlan.visualPlan;
  assert.ok(
    creationVisualErrors(missingPlan, [src]).some((e) =>
      e.includes("visualPlan is required"),
    ),
  );
  const dangling = structuredClone(doc);
  dangling.visualPlan!.images[0].sectionId = "missing";
  assert.ok(
    creationVisualErrors(dangling, [src]).some((e) =>
      e.includes("exactly one"),
    ),
  );
  const duplicate = structuredClone(doc);
  duplicate.sections[2].id = "intro";
  assert.ok(
    creationVisualErrors(duplicate, [src]).some((e) =>
      e.includes("exactly one"),
    ),
  );
  const invented = structuredClone(doc);
  invented.visualPlan!.references = ["cssda-no-such-reference"];
  assert.ok(
    creationVisualErrors(invented, [src], []).some((e) =>
      e.includes("supplied reference"),
    ),
  );
  const optional = structuredClone(doc);
  optional.visualPlan!.images[0].source = "optional-owner";
  assert.ok(
    creationVisualErrors(optional, [src]).some((e) =>
      e.includes("included visualPlan"),
    ),
  );
  assert.throws(
    () =>
      creationAssetsContext([
        {
          src: "https://example.com/photo.jpg",
          subject: "Remote image",
          role: "person",
          framing: "portrait",
        },
      ]),
    /Invalid/,
  );
  assert.ok(
    SiteDocSchema.safeParse(original).success,
    "Historical documents remain readable without a plan",
  );
});

test("supplied object framing preserves the whole subject without changing raw input or later manual edits", () => {
  const raw = make("hero.image-led");
  raw.visualPlan!.images[0].role = "product";
  (raw.sections[1].props as { photo: { fit?: string } }).photo.fit = "cover";
  const fitted = fitCreationImages(raw, [
    {
      src,
      subject: "Approved sample object",
      role: "product",
      framing: "landscape",
    },
  ]);
  assert.equal(
    (fitted.sections[1].props as { photo: { fit: string }; framing: string })
      .photo.fit,
    "contain",
  );
  assert.equal(
    (fitted.sections[1].props as { framing: string }).framing,
    "landscape",
  );
  assert.equal(fitted.visualPlan!.images[0].framing, "landscape");
  assert.equal(
    (raw.sections[1].props as { photo: { fit: string } }).photo.fit,
    "cover",
  );
  const manual = structuredClone(fitted);
  (manual.sections[1].props as { photo: { fit: string } }).photo.fit = "cover";
  assert.ok(
    renderDoc(manual).includes("object-fit:cover"),
    "Renderer honours the owner's later crop",
  );
});

test("owner guidance follows section IDs and narrow patches keep the plan unchanged", () => {
  const doc = make();
  const edited = applyPatch(doc, {
    ops: [{ op: "meta", meta: { title: "A changed title" } }],
  }).doc;
  assert.deepEqual((edited as typeof doc).visualPlan, doc.visualPlan);
  const moved = applyPatch(doc, { ops: [{ op: "move", from: 1, to: 2 }] })
    .doc as typeof doc;
  assert.equal(imageGuidance(moved)[0].sectionIndex, 2);
  const textOnly = make();
  textOnly.sections[1] = {
    composition: "hero.statement",
    id: "intro",
    tone: "default",
    props: { statement: "Ideas for teams", align: "left" },
  };
  assert.deepEqual(
    imageGuidance(textOnly),
    [],
    "A removed image is not still described as included",
  );
  textOnly.visualPlan!.images[0].source = "optional-owner";
  assert.equal(imageGuidance(textOnly)[0].state, "optional");
  const html = renderToStaticMarkup(
    createElement(ImagePlan, { images: imageGuidance(doc), locale: "ru" }),
  );
  for (const text of [
    "План изображений",
    "Портрет спикера",
    "Представить человека",
    "вертикальный",
    "Голова и плечи",
  ])
    assert.ok(html.includes(text));
});

test("the real creation boundary rejects invented media after both attempts and accepts an approved inventory", async () => {
  const previous = { ...process.env },
    oldFetch = globalThis.fetch;
  const root = await mkdtemp(path.join(os.tmpdir(), "windx-visual-plan-"));
  Object.assign(process.env, {
    WINDX_DATA_DIR: root,
    OPENROUTER_API_KEY: "synthetic-key",
    AI_DEMO: "0",
  });
  let calls = 0;
  const doc = make();
  // This fixture's palette is intentionally set to meet current creation contrast.
  doc.tokens.colors = {
    bg: "#FFFFFF",
    surface: "#F2F5F7",
    ink: "#152632",
    muted: "#47515C",
    accent: "#0747D2",
    accentInk: "#FFFFFF",
    line: "#CBD3DC",
  };
  doc.tokens.displayFont = "archivo";
  doc.tokens.displayWeight = 700;
  doc.tokens.displayItalic = false;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({
      choices: [{ message: { content: JSON.stringify(doc) } }],
      usage: { prompt_tokens: 10, completion_tokens: 20, cost: 0 },
    });
  };
  try {
    const plan = await planCreation("A fictional speaker", undefined, "ru");
    let estimate = await issueEstimate("owner", plan);
    await assert.rejects(
      withAiConsent(estimate.id, "owner", plan, () =>
        askForDoc(plan.system, plan.user!, "", undefined, true),
      ),
      /could not be turned into a site/,
    );
    assert.equal(
      calls,
      2,
      "The permissive typography fallback cannot bypass image provenance",
    );
    estimate = await issueEstimate("owner", plan);
    const approved = await withAiConsent(estimate.id, "owner", plan, () =>
      askForDoc(plan.system, plan.user!, "", undefined, true, [src]),
    );
    assert.equal(
      approved.result.doc.sections[1].composition,
      "hero.portrait-intro",
    );
    assert.equal(calls, 3);
  } finally {
    process.env = previous;
    globalThis.fetch = oldFetch;
    await rm(root, { recursive: true, force: true });
  }
});
