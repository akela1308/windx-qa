import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { test } from "node:test";
import { DESIGN_REFERENCES, selectDesignReferences, designReferenceContext } from "../src/lib/design/references";
import { creationUser, referencedCreationUser, creationSystem, editingSystem, planCreation } from "../src/lib/ai/operation-plan";
import { creationAssetsContext } from "../src/lib/design/visual-plan";

const root = "docs/research/design-references-2026";
const corpus = JSON.parse(await readFile(`${root}/catalog.json`, "utf8"));
const annotations = JSON.parse(await readFile(`${root}/annotations.json`, "utf8"));

test("100 distinct 2026 awards have visual notes and intact local evidence", async () => {
  assert.equal(corpus.count, 100);
  assert.equal(corpus.references.length, 100);
  assert.equal(new Set(corpus.references.map((r: {id: string}) => r.id)).size, 100);
  assert.equal(new Set(corpus.references.map((r: {siteUrl: string}) => new URL(r.siteUrl).hostname.replace(/^www\./,""))).size, 100);
  assert.equal(annotations.references.length, 100);
  assert.equal(DESIGN_REFERENCES.length, 100);
  assert.equal(new Set(DESIGN_REFERENCES.map(r => r.category)).size, 18);
  for (const source of corpus.references) {
    assert.ok(source.awardDate >= "2026-01-01" && source.awardDate <= corpus.asOf);
    assert.equal(new URL(source.awardUrl).hostname,"www.cssdesignawards.com");
    assert.match(source.previewPath,/^previews\/[a-z0-9-]+\.jpg$/);
    const bytes = await readFile(`${root}/${source.previewPath}`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"),source.previewSha256,source.id);
    const note = annotations.references.find((r: {id: string}) => r.id === source.id);
    const runtime = DESIGN_REFERENCES.find(r => r.id === source.id)!;
    assert.ok(note.observation && note.transfer);
    assert.equal(runtime.observation,note.observation);
    assert.equal(runtime.transfer,note.transfer);
    assert.equal(runtime.awardUrl,source.awardUrl);
    assert.equal(runtime.name,source.name);
    assert.ok(!("sourceDescription" in runtime),"Untrusted source prose is not model guidance");
    assert.ok(!("thumbnailUrl" in runtime),"Remote assets are not part of generation");
  }
});

test("retrieval finds every named reference and distinguishes content tasks without padding", () => {
  for (const reference of DESIGN_REFERENCES) assert.equal(selectDesignReferences(reference.name)[0]?.id,reference.id,reference.name);
  const legal = selectDesignReferences("A quiet family law consultation with plain readable advice");
  assert.ok(legal.length && legal.every(r => r.pattern === "reading"),"No unrelated award winners to fill four slots");
  const technical = selectDesignReferences("A technical repair service explaining a process");
  assert.ok(technical.length && technical.every(r => r.pattern === "diagram"));
  const photos = selectDesignReferences("Сайт фотографа: портфолио и коллекция работ");
  assert.ok(photos.some(r => r.pattern === "gallery"));
  assert.notDeepEqual(technical.map(r=>r.id),photos.map(r=>r.id));
  assert.deepEqual(selectDesignReferences("A happy accountant"),[],"app must not match happy");
  assert.deepEqual(selectDesignReferences(""),[]);
  assert.deepEqual(selectDesignReferences("product",0.5),[]);
  assert.deepEqual(selectDesignReferences("product",NaN),[]);
  assert.equal(selectDesignReferences("product",1).length,1);
  assert.ok(selectDesignReferences("product collection illustrated technical event",100).length <= 4);
});

test("creation uses bounded references, honours chosen templates/styles and keeps edits separate", async () => {
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async()=>{throw Error("Reference retrieval must be offline");};
  try {
    const brief = "An illustrated community festival with a programme and booking action";
    const context = designReferenceContext(brief);
    assert.ok(Buffer.byteLength(context)<6500);
    assert.match(context,/authored observations, not the images themselves/);
    const selected = selectDesignReferences(brief);
    for (const row of selected) assert.ok(context.includes(row.id));
    assert.equal(creationUser(brief),brief,"Existing plain brief API remains unchanged");
    assert.equal(referencedCreationUser(brief),brief+context+creationAssetsContext([]));
    const plan = await planCreation(brief,undefined,"en");
    assert.equal(plan.user,referencedCreationUser(brief));
    assert.equal(plan.summary.requestsMax,2,"No added classifier, image or paid model request");
    assert.ok(plan.steps[0].inputBytes >= Buffer.byteLength(plan.system+plan.user!)+16000);
    assert.match(plan.system,/Give a visual a role before giving it a frame/);
    const styled = await planCreation(brief,"warm-editorial","en");
    assert.match(styled.user!,/mandatory/);
    const template = await planCreation(brief,undefined,"en","0");
    assert.match(template.user!,/Explicitly selected starting template/);
    assert.ok(!template.user!.includes("Selected visual references"),"A selected template retains its specific layout");
    assert.ok(!(await editingSystem("en")).includes("Design from visual relationships"));
    assert.ok((await creationSystem("en")).includes("Current generation cannot create raster images"));
    await mkdir("data/verification/design-references-2026",{recursive:true});
    const cases = [
      "A keynote speaker booking conferences and company events",
      "A jewellery product collection with ceramic packaging",
      "A quiet family law consultation with plain readable advice",
      "An illustrated playful community festival",
      "A technical repair service explaining a process",
      "Сайт фотографа: портфолио и коллекция работ",
    ];
    await writeFile("data/verification/design-references-2026/retrieval.json",JSON.stringify(cases.map(brief=>({brief,selected:selectDesignReferences(brief).map(r=>({id:r.id,name:r.name,pattern:r.pattern})),contextBytes:Buffer.byteLength(designReferenceContext(brief))})),null,2));
  } finally {globalThis.fetch=oldFetch;}
});
