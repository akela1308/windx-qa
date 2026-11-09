import {canvasSummary} from "@/lib/free-editor/review";
import type {CanvasDoc} from "@/lib/free-editor/model";
import { mediaRefs } from "@/lib/media/refs";
import type { SiteDoc } from "@/lib/design";
import { validateDoc } from "@/lib/design";
import { checkSlop } from "../../../experiments/exp1/a/slop";
import { isEnquiryForm } from "@/lib/enquiries/forms";

export type EditChange = { area: string; index?: number; before: string; after: string; layout: boolean };

// Старые замечания к текстам не превращаются в задание переписать чужие блоки.
// Схема, контраст и обязательные ограничения остаются в полной проверке.
export function validateEditDoc(raw: unknown, current: SiteDoc) {
  const check = validateDoc(raw);
  if (!check.ok) return check;
  const uploaded = new Set(mediaRefs(current));
  if (mediaRefs(check.doc).some(src => !uploaded.has(src))) return { ok: false as const, errors: ["Do not invent or copy uploaded image URLs. Preserve existing owner image references."] };
  // Ручной код непрозрачен для AI: добавление, удаление и изменение только во вкладке Code.
  const embeds = (doc: SiteDoc) => doc.sections.filter((s) => ["embed.code","free.canvas"].includes(s.composition)).map((s) => JSON.stringify(s)).sort();
  if (JSON.stringify(embeds(current)) !== JSON.stringify(embeds(check.doc))) return { ok: false as const, errors: ["Preserve every embed.code and free.canvas section exactly. These sections are edited manually."] };
  const issueKey = (error: string) => error.replace(/^sections\.\d+ \([^)]*\): /, "");
  const inherited = new Set(checkSlop(current).map(issueKey));
  const errors = checkSlop(check.doc).filter((error) => !inherited.has(issueKey(error)));
  return errors.length ? { ok: false as const, errors } : check;
}

// Отчёт строится по документам, а не по обещаниям модели в reply.
// Все значения показываются полностью: неожиданные правки не скрываются.
const layoutKeys = new Set(["align", "ratio", "size", "speed", "columns", "mark", "graphicSide", "framing"]);
function readable(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(readable).filter(Boolean).join("\n");
  if (typeof value === "object") return Object.entries(value).filter(([key]) => !layoutKeys.has(key)).map(([, v]) => readable(v)).filter(Boolean).join("\n");
  return String(value);
}

function changedValues(a: unknown, b: unknown): { before: string; after: string } {
  if (JSON.stringify(a) === JSON.stringify(b)) return { before: "", after: "" };
  if (a && b && typeof a === "object" && typeof b === "object") {
    const old = a as Record<string, unknown>, next = b as Record<string, unknown>;
    const parts = [...new Set([...Object.keys(old), ...Object.keys(next)])]
      .filter((key) => !layoutKeys.has(key)).map((key) => changedValues(old[key], next[key]));
    return { before: parts.map((p) => p.before).filter(Boolean).join("\n"), after: parts.map((p) => p.after).filter(Boolean).join("\n") };
  }
  return { before: readable(a), after: readable(b) };
}

export function describeChanges(before: SiteDoc, after: SiteDoc): EditChange[] {
  const changes: EditChange[] = [];
  const add = (area: string, a: unknown, b: unknown, layout = false, index?: number) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) changes.push({ area, index, ...changedValues(a, b), layout });
  };
  add("meta", before.meta, after.meta);
  add("style", before.tokens, after.tokens);
  for (let i = 0; i < Math.max(before.sections.length, after.sections.length); i++) {
    const a = before.sections[i], b = after.sections[i];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    const settings = (value: unknown) => value && typeof value === "object" ? Object.fromEntries(Object.entries(value).filter(([key]) => layoutKeys.has(key) || key === "height" || key === "mobileHeight")) : {};
    const layout = a?.composition !== b?.composition || a?.tone !== b?.tone || a?.id !== b?.id || JSON.stringify(settings(a?.props)) !== JSON.stringify(settings(b?.props));
    // Смена композиции/тона видна и тогда, когда все слова остались прежними.
    changes.push({ area: (b ?? a).composition.split(".")[0], index: i, ...changedValues(a?.props, b?.props), layout });
  }
  add("facts", before.factsToConfirm, after.factsToConfirm);
  return changes;
}

// Ручная вставка сдвигает номера соседей, но не меняет их содержимое или порядок.
// Показываем саму добавленную, изменённую или удалённую секцию, без ложных замен соседей.
export function describeContentChanges(before: SiteDoc, after: SiteDoc): EditChange[] {
  // При вставке изображения сравниваем соседей без нового блока, а не по сдвинутым индексам.
  if (after.sections.length === before.sections.length + 1) {
    const index = after.sections.findIndex(s => s.composition === "media.image" && !before.sections.some(old => old.id === s.id));
    if (index >= 0) {
      const rest = after.sections.filter((_, i) => i !== index);
      if (JSON.stringify(rest) === JSON.stringify(before.sections) && JSON.stringify({ ...after, sections: before.sections,visualPlan:before.visualPlan }) === JSON.stringify(before)) {
        return [{ area: "media", index, ...changedValues(undefined, after.sections[index].props), layout: true }];
      }
    }
  }
  return describeChanges(before, after);
}
export function describeCodeChanges(before: SiteDoc, after: SiteDoc): EditChange[] {
  return describeManualChanges(before, after, (key) => key === "embed.code", "embed");
}
export function describeCanvasChanges(before: SiteDoc, after: SiteDoc, locale="en"): EditChange[] {
  const blocks=(doc:SiteDoc)=>doc.sections.filter(s=>s.composition==="free.canvas");
  const ids=new Set([...blocks(before),...blocks(after)].map(s=>s.id));
  const changes:EditChange[]=[];
  for(const id of ids){
    const a=blocks(before).find(s=>s.id===id),b=blocks(after).find(s=>s.id===id);
    if(JSON.stringify(a)===JSON.stringify(b))continue;
    const old=(a?.props as {canvas:CanvasDoc}|undefined)?.canvas,next=(b?.props as {canvas:CanvasDoc}|undefined)?.canvas;
    changes.push({area:"free",index:b?after.sections.indexOf(b):before.sections.indexOf(a!),before:canvasSummary(old,old,locale),after:canvasSummary(next,old,locale),layout:true});
  }
  return changes;
}
export function describeFormChanges(before: SiteDoc, after: SiteDoc): EditChange[] {
  return describeManualChanges(before, after, isEnquiryForm, "contact");
}
function describeManualChanges(before: SiteDoc, after: SiteDoc, matches: (key: string) => boolean, area: string): EditChange[] {
  const changes: EditChange[] = [];
  for (const [doc, other, removed] of [[after, before, false], [before, after, true]] as const) {
    doc.sections.forEach((section, index) => {
      if (!matches(section.composition)) return;
      const old = other.sections.find((s) => s.id === section.id && matches(s.composition));
      if (removed && old || JSON.stringify(old) === JSON.stringify(section)) return;
      const a = removed ? section : old, b = removed ? undefined : section;
      changes.push({ area, index, ...changedValues(a?.props, b?.props), layout: true });
    });
  }
  return changes;
}
