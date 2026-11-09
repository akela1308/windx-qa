import { randomUUID } from "node:crypto";
import { z } from "zod";
import { CodePropsSchema, type CodeProps } from "../../../experiments/exp1/a/compositions/embed";
import { validateDoc, type SiteDoc } from "@/lib/design";
import { getManageStore } from "@/lib/storage";
import { describeCodeChanges } from "./edit-review";

export type CodeBlock = { index: number; code: CodeProps };
export function codeBlocks(doc: SiteDoc): CodeBlock[] {
  return doc.sections.flatMap((s, index) => s.composition === "embed.code" ? [{ index, code: CodePropsSchema.parse(s.props) }] : []);
}

const Input = z.object({
  baseVersion: z.number().int().positive(),
  index: z.number().int().min(0).max(15).nullable(),
  after: z.union([z.literal("footer"), z.number().int().min(-1).max(15)]),
  remove: z.boolean(),
  code: z.unknown().optional(),
});

// Та же модель предпросмотра, что для AI, но без вызова модели и расхода кредитов.
export async function prepareCodeEdit(siteId: string, raw: z.input<typeof Input>, message: string) {
  const input = Input.parse(raw);
  const store = await getManageStore();
  const site = await store.getSite(siteId);
  if (!site || site.currentVersion !== input.baseVersion) throw new Error("Stale code edit");
  if (await store.getPendingEdit(siteId)) throw new Error("Review the existing proposal first");
  const current = await store.getVersion(siteId, site.currentVersion);
  if (!current) throw new Error("Current version missing");
  const next = structuredClone(current.doc);
  const index = input.index;
  if (index !== null && next.sections[index]?.composition !== "embed.code") throw new Error("Not a code section");
  if (input.remove) {
    if (index === null) throw new Error("Choose a code section");
    next.sections.splice(index, 1);
  } else {
    const props = CodePropsSchema.parse(input.code);
    if (index !== null) next.sections[index] = { ...next.sections[index], props };
    else {
      const footer = next.sections.findIndex((s) => s.composition.startsWith("footer."));
      const at = input.after === "footer" ? footer < 0 ? next.sections.length : footer : input.after + 1;
      if (at < 0 || at > next.sections.length) throw new Error("Invalid insertion position");
      next.sections.splice(at, 0, { composition: "embed.code", id: `code-${randomUUID().slice(0, 8)}`, tone: "default", props });
    }
  }
  const checked = validateDoc(next);
  if (!checked.ok) throw new Error(checked.errors.join("\n"));
  const id = randomUUID();
  const changes = describeCodeChanges(current.doc, checked.doc);
  if (!changes.length) throw new Error("No changes");
  await store.savePendingEdit(siteId, { id, baseVersion: site.currentVersion, version: {
    action: "code", request: message, reply: message, doc: checked.doc, demo: false,
    usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, estimated: false },
  } });
  return { id, baseVersion: site.currentVersion, changes, reply: message };
}
