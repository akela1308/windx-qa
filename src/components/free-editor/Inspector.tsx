"use client";

import type { ReactNode } from "react";
import { freeText } from "@/lib/free-editor/copy";
import { patchBox, patchElement, type CanvasDoc, type Device, type Element, type Box } from "@/lib/free-editor/model";
import { styles } from "./styles";

export function NumberField({ label, value, min = 0, max = 3000, step = 1, onChange }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void }) {
  return <label className={styles.field}>{label}<input aria-label={label} type="number" min={min} max={max} step={step} value={value} onChange={(e) => {
    if (e.target.value !== "" && e.target.validity.valid) onChange(Number(e.target.value));
  }} /></label>;
}
export function Inspector({ doc, device, selected, onCommit, locale="en", imageControl, linkInputs, onLinkInput }: { doc: CanvasDoc; device: Device; selected: string | null; onCommit: (doc: CanvasDoc) => void; locale?:string; imageControl?:ReactNode; linkInputs?:Record<string,string>; onLinkInput?:(id:string,value:string|null)=>void }) {
  const t=(s:string)=>freeText(locale,s);
  const e = doc.elements.find((e) => e.id === selected);
  if (!e) return <p className={styles.empty}>{t('Select an element on the canvas or in Layers to edit it.')}</p>;
  const patch = (p: Partial<Element>) => onCommit(patchElement(doc, e.id, p));
  const textStyle = (p: Partial<Extract<Element, { type: "text" }>["style"]>) => { if (e.type === "text") patch({ style: { ...e.style, ...p } }); };
  return <div>
    <h2>{t('Element')}</h2>
    <label className={styles.field}>{t('Name')}<input aria-label={t('Element name')} value={e.name} maxLength={80} onChange={(v) => { if (v.target.value.trim()) patch({ name: v.target.value }); }} /></label>
    <p className={styles.hint}>{t(device === "phone" ? "Phone position and size. Desktop stays as it is." : "Desktop position and size. Phone stays as it is.")}</p>
    <div className={styles.grid2}>{(["x", "y", "width", "height"] as const).map((key) => <NumberField key={key} label={key === "x" ? "X" : key === "y" ? "Y" : key === "width" ? t("Width") : t("Height")} value={e[device][key]} min={key === "width" || key === "height" ? 2 : 0} onChange={(value) => onCommit(patchBox(doc, e.id, device, { [key]: value } as Partial<Box>))} />)}</div>
    {e.type === "text" && <>
      <label className={styles.field}>{t('Text')}<textarea aria-label={t('Element text')} rows={5} value={e.text} maxLength={4000} onChange={(v) => { if (v.target.value) patch({ text: v.target.value }); }} /></label>
      <label className={styles.field}>{t('Text role')}<select value={e.tag} onChange={(v) => patch({ tag: v.target.value as typeof e.tag })}><option value="h1">{t('Main heading')}</option><option value="h2">{t('Section heading')}</option><option value="p">{t('Paragraph')}</option></select></label>
      <label className={styles.field}>{t('Typeface')}<select value={e.style.font} onChange={(v) => textStyle({ font: v.target.value as typeof e.style.font })}><option value="sans">{t('Sans serif')}</option><option value="serif">{t('Serif')}</option><option value="mono">{t('Monospace')}</option></select></label>
      <div className={styles.grid2}>
        <NumberField label={t('Font size')} value={device === "phone" ? e.phoneSize : e.style.size} min={10} max={180} onChange={(v) => device === "phone" ? patch({ phoneSize: v }) : textStyle({ size: v })} />
        <NumberField label={t('Line height')} value={e.style.lineHeight} min={0.9} max={2} step={0.01} onChange={(v) => textStyle({ lineHeight: v })} />
      </div>
      <label className={styles.field}>{t('Weight')}<select value={e.style.weight} onChange={(v) => textStyle({ weight: v.target.value as typeof e.style.weight })}><option value="400">{t('Regular')}</option><option value="600">{t('Semibold')}</option><option value="800">{t('Bold')}</option></select></label>
      <label className={styles.field}>{t('Alignment')}<select value={e.style.align} onChange={(v) => textStyle({ align: v.target.value as typeof e.style.align })}><option value="left">{t('Left')}</option><option value="center">{t('Centre')}</option><option value="right">{t('Right')}</option></select></label>
      <label className={styles.field}>{t('Text colour')}<input type="color" value={e.style.colour} onChange={(v) => textStyle({ colour: v.target.value })} /></label>
      <NumberField label={t('Inner spacing')} value={e.style.padding} max={60} onChange={(v) => textStyle({ padding: v })} />
      <p className={styles.hint}>{t("Text and appearance are shared. Font size, position and frame size are separate for each screen.")}</p>
    </>}
    {e.type === "image" && <>
      {imageControl??<>
      <p className={styles.hint}>The image loads directly from its source. This prototype includes three local illustrations.</p>
      <label className={styles.field}>Illustration<select aria-label="Illustration" value={e.src.startsWith("/free-editor/") ? e.src : "external"} onChange={(v) => {
        const descriptions: Record<string, string> = { "/free-editor/wheel.svg": "A bicycle wheel drawn in black and red", "/free-editor/vase.svg": "Terracotta vessel and a branch against a warm wall", "/free-editor/space.svg": "Abstract architectural study of light and space" };
        if (descriptions[v.target.value]) patch({ src: v.target.value, alt: descriptions[v.target.value] });
      }}><option value="/free-editor/wheel.svg">Bicycle wheel</option><option value="/free-editor/vase.svg">Still life</option><option value="/free-editor/space.svg">Space study</option><option value="external" disabled>External image</option></select></label>
      <form onSubmit={(v) => { v.preventDefault(); const data = new FormData(v.currentTarget); const result = data.get("src"); if (typeof result === "string") { try { patch({ src: result }); v.currentTarget.reset(); } catch { v.currentTarget.querySelector("input")?.setCustomValidity("Use a valid HTTPS image URL"); v.currentTarget.reportValidity(); } } }}>
        <label className={styles.field}>External image URL<input type="url" name="src" aria-label="External image URL" placeholder="https://…" required onChange={(v) => v.target.setCustomValidity("")} /></label><button type="submit">Use image URL</button>
      </form>
      </>}
      <label className={styles.field}>{t('Image description')}<textarea aria-label={t('Image description')} rows={3} maxLength={240} value={e.alt} onChange={(v) => { if (v.target.value) patch({ alt: v.target.value }); }} /></label>
      <label className={styles.field}>{t('Fit')}<select value={e.fit} onChange={(v) => patch({ fit: v.target.value as typeof e.fit })}><option value="cover">{t('Fill frame')}</option><option value="contain">{t('Show whole image')}</option></select></label>
    </>}
    {e.type === "shape" && <label className={styles.field}>{t('Fill')}<input type="color" value={e.fill} onChange={(v) => patch({ fill: v.target.value })} /></label>}
    {e.type !== "text" && <NumberField label={t('Corner radius')} value={e.radius} max={300} onChange={(v) => patch({ radius: v })} />}
    {e.type!=="shape"&&<form key={e.id+e.href} onSubmit={event=>{event.preventDefault();const href=String(new FormData(event.currentTarget).get("href")??"").trim();try{patch({href:href||undefined});onLinkInput?.(e.id,null);}catch{const input=event.currentTarget.querySelector("input");input?.setCustomValidity(t("Use a valid link"));input?.reportValidity();}}}><label className={styles.field}>{t("Link (optional)")}<input name="href" aria-label={t("Link (optional)")} value={linkInputs ? linkInputs[e.id] ?? e.href ?? "" : undefined} defaultValue={linkInputs ? undefined : e.href??""} maxLength={2000} onChange={event=>{event.target.setCustomValidity("");onLinkInput?.(e.id,event.target.value);}}/></label><button type="submit">{t("Set link")}</button></form>}
    <p className={styles.hint}>{t("Element ID")}: {e.id}</p>
  </div>;
}
