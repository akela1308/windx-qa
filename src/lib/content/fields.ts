import { z } from "zod";
import { COMPOSITIONS } from "../../../experiments/exp1/a/schema";
import { PhotoSchema } from "../../../experiments/exp1/a/parts";
import type { SiteDoc } from "@/lib/design";

export type ContentField = { path: string; kind: "text" | "link" | "photo"; value: string; required: boolean; max: number; photo?: z.infer<typeof PhotoSchema> };
export type ContentSection = { index: number; composition: string; fields: ContentField[]; facts?: { fact: string; where: string }[] };
const hidden = new Set(["d", "fill", "stroke", "viewBox", "paths", "svg", "src", "positionX", "positionY", "fit"]);
// Поля выводятся из той же схемы, которой проверяется сайт. Перечисления оформления не редактируются как текст.
function fields(schema: z.ZodType, value: unknown, path: string, optional = false): ContentField[] {
  if (schema instanceof z.ZodOptional) return fields(schema.unwrap() as z.ZodType, value, path, true);
  if (schema === PhotoSchema) {
    const photo = value as z.infer<typeof PhotoSchema> | undefined;
    return [{ path, kind: "photo", value: photo?.src ?? "", required: !optional, max: 500, photo }];
  }
  if (schema instanceof z.ZodString) return [{ path, kind: path.endsWith(".href") ? "link" : "text", value: typeof value === "string" ? value : "", required: !optional && (schema.minLength ?? 0) > 0, max: Math.min(schema.maxLength ?? 5000, 5000) }];
  if (optional && value === undefined) return [];
  if (schema instanceof z.ZodObject) return Object.entries(schema.shape).flatMap(([key, child]) => hidden.has(key) ? [] : fields(child as z.ZodType, (value as Record<string, unknown> | undefined)?.[key], path ? `${path}.${key}` : key, optional));
  if (schema instanceof z.ZodArray) return (Array.isArray(value) ? value : []).flatMap((v, i) => fields(schema.element as z.ZodType, v, `${path}.${i}`));
  if (schema instanceof z.ZodTuple) return schema.def.items.flatMap((s, i) => fields(s as z.ZodType, (value as unknown[])?.[i], `${path}.${i}`));
  return [];
}
export function contentSections(doc: SiteDoc): ContentSection[] {
  return [
    { index: -1, composition: "meta", fields: fields(z.object({ businessName: z.string().min(1).max(200), title: z.string().min(1).max(70), description: z.string().min(1).max(170) }), doc.meta, "") },
    ...doc.sections.map((s, index) => ({ index, composition: s.composition, facts: doc.factsToConfirm.filter(f => f.where.toLowerCase().startsWith(s.composition.split(".")[0])), fields: ["embed.code","free.canvas"].includes(s.composition) ? [] : fields(COMPOSITIONS[s.composition].props, s.props, "") })),
  ];
}
export function writeField(root: unknown, path: string, value: unknown) {
  const keys = path.split(".");
  let node = root as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) node = node[key] as Record<string, unknown>;
  node[keys.at(-1)!] = value;
}
