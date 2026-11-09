import { z } from "zod";

const prefix = "windx:code-draft:v1:";
export const CODE_DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
const position = z.string().regex(/^(footer|\d{1,3})$/);
export const CodeValuesSchema = z.object({
  title: z.string().max(80), html: z.string().max(50000), css: z.string().max(30000), js: z.string().max(30000),
  height: z.string().max(8), mobileHeight: z.string().max(8), after: position,
}).strict();
export type CodeValues = z.infer<typeof CodeValuesSchema>;
const schema = z.object({
  format: z.literal(1), baseVersion: z.number().int().positive(),
  selection: z.string().regex(/^(new|\d{1,3})$/), savedAt: z.number().finite(), values: CodeValuesSchema,
}).strict();
export type CodeDraft = z.infer<typeof schema>;
export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;
export function codeDraftKey(owner: string, site: string) {
  return `${prefix}${encodeURIComponent(owner)}:${encodeURIComponent(site)}`;
}
export function readCodeDraft(storage: DraftStorage, key: string, now = Date.now()): CodeDraft | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  let result;
  try { result = raw.length <= 700000 ? schema.safeParse(JSON.parse(raw)) : null; } catch { result = null; }
  if (!result?.success || result.data.savedAt > now + 60000 || now - result.data.savedAt > CODE_DRAFT_TTL) {
    storage.removeItem(key); return null;
  }
  return result.data;
}
export function writeCodeDraft(storage: DraftStorage, key: string, draft: CodeDraft) {
  storage.setItem(key, JSON.stringify(schema.parse(draft)));
}
// Удаляем только собственные черновики, не настройки и данные других приложений.
export function clearCodeDrafts() {
  try {
    const storage = window.localStorage;
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) storage.removeItem(key);
    }
  } catch { /* Запрет browser storage не мешает выходу из аккаунта. */ }
}
