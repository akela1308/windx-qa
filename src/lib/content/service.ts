import { randomUUID } from "node:crypto";
import { z } from "zod";
import { validateDoc, type SiteDoc } from "@/lib/design";
import { getManageStore } from "@/lib/storage";
import { describeContentChanges } from "@/lib/sites/edit-review";
import { contentSections, writeField } from "./fields";
import { MEDIA_PATH } from "@/lib/media/refs";
import { readImage } from "@/lib/media/files";
import { PhotoSchema } from "../../../experiments/exp1/a/parts";
import { ContentEditError } from "./errors";

const Input = z.object({ resolvedFacts: z.array(z.string().max(2000)).max(100).default([]), intent: z.enum(["update", "add-image"]).default("update"), afterSection:z.number().int().min(0).max(15).optional(), baseVersion: z.number().int().positive(), section: z.number().int().min(-1).max(15), changes: z.array(z.object({ path: z.string().max(160), value: z.unknown() })).min(1).max(200) });
const safeLink = (v: string) => /^(?:#[a-z0-9_-]*|\/(?!\/)[^\s\\]*|https?:\/\/[^\s\\]+|mailto:[^\s<>]+|tel:\+?[\d() .-]+)$/i.test(v) && !/[\u0000-\u001f\u007f]/.test(v);
export async function prepareContentEdit(siteId: string, raw: z.input<typeof Input>, message: string) {
  const input = Input.parse(raw);
  const store = await getManageStore();
  const site = await store.getSite(siteId);
  if (!site) throw new ContentEditError("invalid");
  if (site.currentVersion !== input.baseVersion) throw new ContentEditError("stale");
  if (await store.getPendingEdit(siteId)) throw new ContentEditError("pending");
  const current = await store.getVersion(siteId, site.currentVersion);
  if (!current) throw new Error("missing");
  const next = structuredClone(current.doc);
  let sectionIndex = input.section;
  if (input.intent === "add-image") {
    const footer = next.sections.findIndex(s => s.composition.startsWith("footer."));
    if(input.afterSection!==undefined&&(!next.sections[input.afterSection]||next.sections[input.afterSection].composition.startsWith("footer.")))throw new ContentEditError("invalid");
    sectionIndex = input.afterSection!==undefined ? input.afterSection+1 : footer < 0 ? next.sections.length : footer;
    const targetId=input.afterSection!==undefined?next.sections[input.afterSection].id:undefined;
    const planned=targetId?next.visualPlan?.images.find(i=>i.sectionId===targetId&&i.source==="optional-owner"):undefined;
    const id=`image-${randomUUID().slice(0,8)}`;
    next.sections.splice(sectionIndex, 0, { composition: "media.image", id, tone: "default", props: { photo: { subject: "Image" },...(planned?{framing:planned.framing}:{}) } });
    if(planned){planned.sectionId=id;planned.source="owner";}
  }
  const section = contentSections(next).find(s => s.index === sectionIndex);
  if (!section) throw new Error("invalid");
  const target = sectionIndex === -1 ? next.meta : next.sections[sectionIndex].props;
  const seen = new Set<string>();
  for (const change of input.changes) {
    const field = section.fields.find(f => f.path === change.path);
    if (!field || seen.has(change.path)) throw new Error("invalid");
    seen.add(change.path);
    let value = change.value;
    if (field.kind === "photo") {
      if (value === null && !field.required) { writeField(target, change.path, undefined); continue; }
      if (value === null) throw new ContentEditError("required", field.path);
      const photo = PhotoSchema.safeParse(value);
      if (!photo.success) throw new ContentEditError("image", field.path);
      value = photo.data;
      if (sectionIndex !== -1 && photo.data.subject.includes("—")) throw new ContentEditError("typography", field.path);
      const src = (value as z.infer<typeof PhotoSchema>).src;
      if (src) {
        if (MEDIA_PATH.exec(src)?.[1] !== siteId) throw new ContentEditError("image", field.path);
        try { await readImage(src); } catch { throw new ContentEditError("image", field.path); }
      }
    } else {
      if (typeof value !== "string") throw new ContentEditError("invalid");
      if (value.length > field.max) throw new ContentEditError("tooLong", field.path, field.max);
      if (field.required && !value.trim()) throw new ContentEditError("required", field.path);
      if (field.kind === "link" && value && !safeLink(value)) throw new ContentEditError("link", field.path);
      if (sectionIndex !== -1 && value.includes("—")) throw new ContentEditError("typography", field.path);
      if (!value && !field.required) value = undefined;
    }
    writeField(target, change.path, value);
  }
  if (input.intent === "add-image" && !(next.sections[sectionIndex].props as { photo?: { src?: string } }).photo?.src) throw new ContentEditError("image", "photo");
  if(input.intent==="add-image"){
    const added=next.sections[sectionIndex];
    const planned=next.visualPlan?.images.find(image=>image.sectionId===added.id&&image.source==="owner");
    if(planned)planned.subject=(added.props as {photo:{subject:string}}).photo.subject;
  }
  // Нормализация схемы не должна превращать неизменённое поле в новую правку.
  if (!describeContentChanges(current.doc, next).length) throw new ContentEditError("unchanged");
  if (input.resolvedFacts.length) {
    const allowed = new Set(section.facts?.map(f => f.fact) ?? []);
    if (input.resolvedFacts.some(f => !allowed.has(f))) throw new Error("invalid");
    next.factsToConfirm = next.factsToConfirm.filter(f => !input.resolvedFacts.includes(f.fact));
  }
  const check = validateDoc(next);
  if (!check.ok) throw new ContentEditError("invalid");
  const changes = describeContentChanges(current.doc, check.doc);
  if (!changes.length) throw new ContentEditError("unchanged");
  const id = randomUUID();
  await store.savePendingEdit(siteId, { id, baseVersion: site.currentVersion, version: {
    action: "manual", request: message, reply: message, doc: check.doc as SiteDoc, demo: false,
    usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, estimated: false },
  } });
  return { id, baseVersion: site.currentVersion, changes, reply: message };
}
