import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getManageStore } from "@/lib/storage";
import { validateDoc, type SiteDoc } from "@/lib/design";
import { MEDIA_PATH, mediaRefs } from "@/lib/media/refs";
import { readImage } from "@/lib/media/files";
import { describeCanvasChanges } from "@/lib/sites/edit-review";
import { PublishedCanvasSchema, type CanvasDoc } from "./model";

export type CanvasBlock = { id: string; index: number; canvas: CanvasDoc };
export function canvasBlocks(doc: SiteDoc): CanvasBlock[] {
  return doc.sections.flatMap((s, index) =>
    s.composition === "free.canvas" && s.id
      ? [
          {
            id: s.id,
            index,
            canvas: PublishedCanvasSchema.parse(
              (s.props as { canvas: unknown }).canvas,
            ),
          },
        ]
      : [],
  );
}
const Input = z.object({
  baseVersion: z.number().int().positive(),
  sectionId: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .nullable(),
  after: z.union([z.literal("footer"), z.number().int().min(-1).max(15)]),
  remove: z.boolean(),
  canvas: z.unknown().optional(),
});
export async function prepareCanvasEdit(
  siteId: string,
  raw: z.input<typeof Input>,
  message: string,
  locale="en",
) {
  const input = Input.parse(raw),
    store = await getManageStore(),
    site = await store.getSite(siteId);
  if (!site || site.currentVersion !== input.baseVersion)
    throw new Error("stale");
  if (await store.getPendingEdit(siteId)) throw new Error("pending");
  const current = await store.getVersion(siteId, site.currentVersion);
  if (!current) throw new Error("missing");
  const next = structuredClone(current.doc),
    index =
      input.sectionId === null
        ? -1
        : next.sections.findIndex(
            (s) => s.id === input.sectionId && s.composition === "free.canvas",
          );
  if (input.sectionId !== null && index < 0) throw new Error("missing");
  const sectionId = input.sectionId ?? `free-${randomUUID().slice(0, 8)}`;
  if (input.remove) {
    if (index < 0) throw new Error("missing");
    next.sections.splice(index, 1);
  } else {
    const canvas = PublishedCanvasSchema.parse(input.canvas);
    for (const src of mediaRefs(canvas)) {
      if (MEDIA_PATH.exec(src)?.[1] !== siteId) throw new Error("image");
      await readImage(src);
    }
    const section = {
      composition: "free.canvas",
      id: sectionId,
      tone: "default" as const,
      props: { canvas },
    };
    if (index >= 0)
      next.sections[index] = { ...next.sections[index], props: { canvas } };
    else {
      const footer = next.sections.findIndex((s) =>
        s.composition.startsWith("footer."),
      );
      const at =
        input.after === "footer"
          ? footer < 0
            ? next.sections.length
            : footer
          : input.after + 1;
      if (at < 0 || at > next.sections.length) throw new Error("position");
      next.sections.splice(at, 0, section);
    }
  }
  const checked = validateDoc(next);
  if (!checked.ok) throw new Error("invalid");
  const changes = describeCanvasChanges(current.doc, checked.doc,locale);
  if (!changes.length) throw new Error("unchanged");
  const id = randomUUID();
  await store.savePendingEdit(siteId, {
    id,
    baseVersion: site.currentVersion,
    canvas: { sectionId, remove: input.remove },
    version: {
      action: "canvas",
      request: message,
      reply: message,
      doc: checked.doc,
      demo: false,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, estimated: false },
    },
  });
  return {
    id,
    baseVersion: site.currentVersion,
    changes,
    reply: message,
    sectionId,
  };
}
