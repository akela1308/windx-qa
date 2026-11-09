import { z } from "zod";
import type { ContentSection } from "@/lib/content/fields";
import type { DraftStorage } from "./code";
import { CODE_DRAFT_TTL } from "./code";

export const TEXT_DRAFT_PREFIX = "windx:text-draft:v1:";
const path = z.string().min(1).max(150).regex(/^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*$/).refine(p => !p.split(".").some(k => ["__proto__", "constructor", "prototype"].includes(k)));
const schema = z.object({
  format: z.literal(1), baseVersion: z.number().int().positive(), index: z.number().int().min(-1).max(999),
  composition: z.string().min(1).max(100), savedAt: z.number().finite(),
  changes: z.array(z.object({ path, value: z.string().max(5000) }).strict()).min(1).max(500),
}).strict().refine(d => new Set(d.changes.map(c => c.path)).size === d.changes.length)
  .refine(d => d.changes.reduce((n, c) => n + c.value.length, 0) <= 100000);
export type TextDraft = z.infer<typeof schema>;
export function textDraftScope(owner: string, site: string) {
  return `${TEXT_DRAFT_PREFIX}${encodeURIComponent(owner)}:${encodeURIComponent(site)}:`;
}
export function textDraftKey(scope: string, index: number) { return `${scope}${index}`; }
export function readTextDrafts(storage: DraftStorage, scope: string, now = Date.now()): TextDraft[] {
  const drafts: TextDraft[] = [];
  for (let i = storage.length - 1; i >= 0; i--) {
    const key = storage.key(i);
    if (!key?.startsWith(scope)) continue;
    const raw = storage.getItem(key);
    let parsed;
    try { parsed = raw && raw.length <= 700000 ? schema.safeParse(JSON.parse(raw)) : null; } catch { parsed = null; }
    if (!parsed?.success || key !== textDraftKey(scope, parsed.data.index) || parsed.data.savedAt > now + 60000 || now - parsed.data.savedAt > CODE_DRAFT_TTL) {
      storage.removeItem(key); continue;
    }
    drafts.push(parsed.data);
  }
  return drafts.sort((a, b) => b.savedAt - a.savedAt);
}
export function writeTextDraft(storage: DraftStorage, scope: string, draft: TextDraft) {
  storage.setItem(textDraftKey(scope, draft.index), JSON.stringify(schema.parse(draft)));
}
// Восстановление только в существующие текстовые поля той же неизменяемой версии.
export function canRestoreText(draft: TextDraft, version: number, sections: ContentSection[]) {
  const section = sections.find(s => s.index === draft.index && s.composition === draft.composition);
  return draft.baseVersion === version && !!section && draft.changes.every(c => section.fields.some(f => f.path === c.path && f.kind !== "photo" && c.value.length <= f.max));
}
export function textDraftChanges(section: ContentSection, values: Record<string, unknown>) {
  return section.fields.filter(f => f.kind !== "photo" && typeof values[f.path] === "string" && values[f.path] !== f.value)
    .map(f => ({ path: f.path, value: values[f.path] as string }));
}
export function clearTextDrafts() {
  try {
    const storage = window.localStorage;
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (key?.startsWith(TEXT_DRAFT_PREFIX)) storage.removeItem(key);
    }
  } catch { /* Запрет storage не мешает выходу. */ }
}
