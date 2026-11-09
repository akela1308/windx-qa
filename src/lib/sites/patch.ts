import type { SiteDoc } from "@/lib/design";

// Правка сайта в виде списка изменений от модели (src/lib/prompts/edit-patch.md).
// Модель присылает только то, что меняется, поэтому ответ короткий и дешёвый.
// Результат потом целиком проверяется схемой, как обычный сайт.

type Section = SiteDoc["sections"][number];
export type EditOp =
  | { op: "replace"; index: number; section: Section }
  | { op: "insert"; after: number; section: Section }
  | { op: "remove"; index: number }
  | { op: "move"; from: number; to: number }
  | { op: "tokens"; tokens: Partial<SiteDoc["tokens"]> }
  | { op: "meta"; meta: Partial<SiteDoc["meta"]> }
  | { op: "facts"; factsToConfirm: SiteDoc["factsToConfirm"] };

export type EditPatch = { reply?: string; ops: EditOp[] };

// Применяет изменения к копии документа. Ошибки в индексах возвращаются текстом для модели.
export function applyPatch(doc: SiteDoc, patch: EditPatch): { doc: unknown; errors: string[] } {
  const next = structuredClone(doc) as SiteDoc & Record<string, unknown>;
  const errors: string[] = [];
  const inRange = (i: number, extra = 0) => Number.isInteger(i) && i >= 0 && i < next.sections.length + extra;
  if (!Array.isArray(patch?.ops) || patch.ops.length === 0) return { doc: next, errors: ["ops must be a non-empty array"] };

  patch.ops.forEach((o, k) => {
    switch (o.op) {
      case "replace":
        if (inRange(o.index)) next.sections[o.index] = o.section;
        else errors.push(`ops.${k}: index ${o.index} is out of range`);
        break;
      case "insert":
        if (o.after === -1 || inRange(o.after)) next.sections.splice(o.after + 1, 0, o.section);
        else errors.push(`ops.${k}: after ${o.after} is out of range`);
        break;
      case "remove":
        if (inRange(o.index)) next.sections.splice(o.index, 1);
        else errors.push(`ops.${k}: index ${o.index} is out of range`);
        break;
      case "move":
        if (inRange(o.from) && inRange(o.to)) next.sections.splice(o.to, 0, ...next.sections.splice(o.from, 1));
        else errors.push(`ops.${k}: move ${o.from} to ${o.to} is out of range`);
        break;
      case "tokens":
        next.tokens = { ...next.tokens, ...o.tokens, colors: { ...next.tokens.colors, ...(o.tokens.colors ?? {}) } };
        break;
      case "meta":
        next.meta = { ...next.meta, ...o.meta };
        break;
      case "facts":
        next.factsToConfirm = o.factsToConfirm;
        break;
      default:
        errors.push(`ops.${k}: unknown op ${(o as { op?: string }).op}`);
    }
  });
  return { doc: next, errors };
}

// Текущий сайт для модели: компактно и с номерами разделов, на которые ссылаются операции.
export function describeForEdit(doc: SiteDoc): string {
  const { sections, ...rest } = doc;
  const list = sections.map((s, i) => `${i}: ${s.composition === "embed.code" ? JSON.stringify({ composition: s.composition, id: s.id, note: "Opaque owner code. Preserve this section exactly; do not replace or remove it." }) : s.composition === "free.canvas" ? JSON.stringify({composition:s.composition,id:s.id,title:(s.props as {canvas:{title:string}}).canvas.title,elements:(s.props as {canvas:{elements:{id:string;type:string;name:string}[]}}).canvas.elements.map(e=>({id:e.id,type:e.type,name:e.name})),note:"Manual owner canvas. Preserve the complete section exactly. Use the visual editor to change its elements."}) : JSON.stringify(s)}`).join("\n");
  return `${JSON.stringify(rest)}\n\nSections:\n${list}`;
}
