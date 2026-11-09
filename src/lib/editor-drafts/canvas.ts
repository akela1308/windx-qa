import { z } from "zod";
import { CanvasDocSchema, type CanvasDoc } from "@/lib/free-editor/model";
import { CODE_DRAFT_TTL, type DraftStorage } from "./code";

export const CANVAS_DRAFT_PREFIX = "windx:canvas-draft:v1:";
const target = z.string().regex(/^[a-z0-9-]{1,80}$/).nullable();
const schema = z.object({
  format: z.literal(1), baseVersion: z.number().int().positive(), sectionId: target,
  savedAt: z.number().finite(), doc: CanvasDocSchema,
  after: z.string().regex(/^(footer|-1|[0-9]|1[0-5])$/),
  links: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/), z.string().max(2000)).default({}),
  device: z.enum(["desktop", "phone"]), selected: z.string().max(64).nullable(),
}).strict().refine(d => d.doc.format === "windx-free-block" && JSON.stringify(d.doc).length <= 250000 && Object.entries(d.links).every(([id]) => d.doc.elements.some(e => e.id === id && e.type !== "shape")));
export type CanvasDraft = z.infer<typeof schema>;
export function canvasDraftScope(owner: string, site: string) {
  return `${CANVAS_DRAFT_PREFIX}${encodeURIComponent(owner)}:${encodeURIComponent(site)}:`;
}
export function canvasDraftKey(scope: string, sectionId: string | null) { return `${scope}${sectionId ?? "new"}`; }
function ownedImages(doc: CanvasDoc, site: string) {
  return doc.elements.every(e => e.type !== "image" || e.src === "" || /^\/media\/[a-z0-9-]{1,80}\/[a-f0-9-]{36}\.webp$/.test(e.src) && e.src.split("/")[2] === site);
}
export function readCanvasDrafts(storage: DraftStorage, scope: string, site: string, now = Date.now()): CanvasDraft[] {
  const drafts: CanvasDraft[] = [];
  for (let i = storage.length - 1; i >= 0; i--) {
    const key = storage.key(i);
    if (!key?.startsWith(scope)) continue;
    const raw = storage.getItem(key);
    let parsed;
    try { parsed = raw && raw.length <= 800000 ? schema.safeParse(JSON.parse(raw)) : null; } catch { parsed = null; }
    if (!parsed?.success || key !== canvasDraftKey(scope, parsed.data.sectionId) || !ownedImages(parsed.data.doc, site) || parsed.data.savedAt > now + 60000 || now - parsed.data.savedAt > CODE_DRAFT_TTL) {
      storage.removeItem(key); continue;
    }
    drafts.push(parsed.data);
  }
  return drafts.sort((a, b) => b.savedAt - a.savedAt);
}
export function writeCanvasDraft(storage: DraftStorage, scope: string, site: string, draft: CanvasDraft) {
  const checked = schema.parse(draft);
  if (!ownedImages(checked.doc, site)) throw new Error("Upload an owner image");
  storage.setItem(canvasDraftKey(scope, checked.sectionId), JSON.stringify(checked));
}
export function canRestoreCanvas(draft: CanvasDraft, version: number, sectionId: string | null, sections: string[]) {
  return draft.baseVersion === version && draft.sectionId === sectionId && (sectionId === null || sections.includes(sectionId));
}
export function clearCanvasDrafts() {
  try {
    const storage = window.localStorage;
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (key?.startsWith(CANVAS_DRAFT_PREFIX)) storage.removeItem(key);
    }
  } catch { /* Запрет storage не мешает выходу. */ }
}
