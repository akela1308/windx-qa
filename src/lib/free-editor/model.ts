import { z } from "zod";

// Общая модель LAB и клиентского блока: два независимых холста с общим содержимым.
export const WIDTH = { desktop: 1120, phone: 360 } as const;
export type Device = keyof typeof WIDTH;
const colour = z.string().regex(/^#[0-9a-f]{6}$/i);
const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/);
export const BoxSchema = z.object({
  x: z.number().finite().min(0).max(1120), y: z.number().finite().min(0).max(3000),
  width: z.number().finite().min(2).max(1120), height: z.number().finite().min(2).max(3000),
});
export type Box = z.infer<typeof BoxSchema>;
export const TextStyleSchema = z.object({
  font: z.enum(["sans", "serif", "mono"]), size: z.number().min(10).max(180),
  weight: z.enum(["400", "600", "800"]), lineHeight: z.number().min(0.9).max(2),
  colour, align: z.enum(["left", "center", "right"]), padding: z.number().min(0).max(60),
});
export const LinkSchema = z.string().max(2000).refine(s => {
  if (/[\s\u0000-\u001f\u007f\\]/.test(s)) return false;
  if (/^#[a-z0-9_-]*$/i.test(s) || /^\/(?!\/)/.test(s) || /^mailto:[^<>@]+@[^<>@]+$/i.test(s) || /^tel:\+?[\d().-]{7,}$/.test(s)) return true;
  try { const u=new URL(s);return ["https:","http:"].includes(u.protocol)&&!u.username&&!u.password; } catch {return false;}
}, "Invalid link");
const base = { id, name: z.string().trim().min(1).max(80), layer: z.number().int().min(0).max(10000).default(0), desktop: BoxSchema, phone: BoxSchema };
const text = z.object({ ...base, type: z.literal("text"), text: z.string().min(1).max(4000),
  tag: z.enum(["h1", "h2", "p"]), style: TextStyleSchema,
  phoneSize: z.number().min(10).max(180), href: LinkSchema.optional(),
});
// Локальные иллюстрации стенда и HTTPS. Произвольный HTML/SVG в документ не попадает.
export const ImageSourceSchema = z.string().max(2000).refine((s) => {
  if (s === "" || /^\/media\/[a-z0-9-]{1,80}\/[a-f0-9-]{36}\.webp$/.test(s)) return true;
  if (/^\/free-editor\/[a-z0-9-]+\.svg$/.test(s)) return true;
  try { const u = new URL(s); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; }
}, "Use an HTTPS image URL or a local prototype illustration");
const image = z.object({ ...base, type: z.literal("image"), src: ImageSourceSchema,
  alt: z.string().min(1).max(240), fit: z.enum(["cover", "contain"]), radius: z.number().min(0).max(300), href: LinkSchema.optional(),
});
const shape = z.object({ ...base, type: z.literal("shape"), fill: colour, radius: z.number().min(0).max(300) });
export const ElementSchema = z.discriminatedUnion("type", [text, image, shape]);
export type Element = z.infer<typeof ElementSchema>;
export const CanvasDocSchema = z.object({
  format: z.enum(["windx-free-block-prototype", "windx-free-block"]), version: z.literal(1),
  title: z.string().trim().min(1).max(100), background: colour,
  height: z.object({ desktop: z.number().int().min(200).max(3000), phone: z.number().int().min(200).max(3000) }),
  elements: z.array(ElementSchema).max(40),
}).superRefine((doc, ctx) => {
  const seen = new Set<string>();
  for (const [index, element] of doc.elements.entries()) {
    if (seen.has(element.id)) ctx.addIssue({ code: "custom", path: ["elements", index, "id"], message: "Duplicate element ID" });
    seen.add(element.id);
    for (const device of ["desktop", "phone"] as const) {
      const b = element[device];
      if (b.x + b.width > WIDTH[device] + 0.01 || b.y + b.height > doc.height[device] + 0.01)
        ctx.addIssue({ code: "custom", path: ["elements", index, device], message: "Element is outside the canvas" });
    }
  }
});
export type CanvasDoc = z.infer<typeof CanvasDocSchema>;
// В клиентском сайте только собственные обработанные загрузки. Внешние URL остаются в LAB.
export const PublishedCanvasSchema = CanvasDocSchema.superRefine((doc,ctx)=>{
  if(doc.format!=="windx-free-block")ctx.addIssue({code:"custom",message:"Unsupported free block format"});
  doc.elements.forEach((e,i)=>{if(e.type==="image"&&!/^\/media\/[a-z0-9-]{1,80}\/[a-f0-9-]{36}\.webp$/.test(e.src))ctx.addIssue({code:"custom",path:["elements",i,"src"],message:"Upload an owner image"});});
});

export function parseDocument(raw: string): CanvasDoc {
  if (raw.length > 250000) throw new Error("Document is too large");
  return CanvasDocSchema.parse(JSON.parse(raw));
}
export function clampBox(box: Box, device: Device, height: number): Box {
  const width = Math.max(2, Math.min(WIDTH[device], box.width));
  const h = Math.max(2, Math.min(height, box.height));
  return { x: Math.max(0, Math.min(WIDTH[device] - width, box.x)), y: Math.max(0, Math.min(height - h, box.y)), width, height: h };
}
export function patchBox(doc: CanvasDoc, id: string, device: Device, patch: Partial<Box>): CanvasDoc {
  return { ...doc, elements: doc.elements.map((e) => e.id === id ? { ...e, [device]: clampBox({ ...e[device], ...patch }, device, doc.height[device]) } : e) };
}
export function patchElement(doc: CanvasDoc, id: string, patch: Partial<Element>): CanvasDoc {
  return CanvasDocSchema.parse({ ...doc, elements: doc.elements.map((e) => e.id === id ? { ...e, ...patch, id: e.id, type: e.type } : e) });
}
export function reorder(doc: CanvasDoc, id: string, direction: number): CanvasDoc {
  const stack = [...doc.elements].sort((a, b) => a.layer - b.layer), at = stack.findIndex((e) => e.id === id);
  const to = Math.max(0, Math.min(stack.length - 1, at + direction));
  if (at < 0 || at === to) return doc;
  const [element] = stack.splice(at, 1); stack.splice(to, 0, element);
  // Меняется только визуальный слой. Порядок DOM и чтения остаётся прежним.
  return { ...doc, elements: doc.elements.map((e) => ({ ...e, layer: stack.findIndex((n) => n.id === e.id) })) };
}

export type History = { past: CanvasDoc[]; present: CanvasDoc; future: CanvasDoc[] };
export function history(doc: CanvasDoc): History { return { past: [], present: doc, future: [] }; }
export function commit(h: History, doc: CanvasDoc): History {
  const checked = CanvasDocSchema.parse(doc);
  if (JSON.stringify(h.present) === JSON.stringify(checked)) return h;
  return { past: [...h.past.slice(-79), h.present], present: checked, future: [] };
}
export function undo(h: History): History {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}
export function redo(h: History): History {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}
