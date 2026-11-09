"use client";
import { useState } from "react";
import type { ContentField } from "@/lib/content/fields";
import { contentCopy } from "@/lib/content/copy";

type Photo = NonNullable<ContentField["photo"]>;
export function ImageField({ field, value, onChange, siteId, locale, busy, pending = false, setBusy }: { field: ContentField; value: Photo | null; onChange: (value: Photo | null) => void; siteId: string; locale: string; busy: boolean; pending?: boolean; setBusy: (v: boolean) => void }) {
  const c = contentCopy(locale);
  const blocked = busy || pending;
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const photo: Photo = value ?? { subject: "" };
  const update = (change: Partial<Photo>) => onChange({ ...photo, ...change });
  const fieldClass = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2";
  return <div className="mt-2 space-y-3">
    {photo.src && <div className="relative h-44 rounded-lg border border-line bg-bg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.src} alt={photo.subject} className="h-full w-full rounded-lg" style={{ objectFit: photo.fit ?? "cover", objectPosition: `${photo.positionX ?? 50}% ${photo.positionY ?? 50}%` }} />
    </div>}
    <label className={`inline-flex cursor-pointer rounded-full border border-line px-3 py-2 ${blocked ? "pointer-events-none opacity-50" : ""}`}>
      {busy ? c.uploading : pending ? c.saving : photo.src ? c.replace : c.upload}
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={blocked} onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = "";
        if (!file) return;
        setNotice(""); setError("");
        if (file.size > 8 * 1024 * 1024) { setError(c.uploadError); return; }
        setBusy(true);
        try {
          const response = await fetch(`/sites/${siteId}/images`, { method: "POST", headers: { "content-type": file.type || "application/octet-stream" }, body: file });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          update({ src: result.src, subject: photo.subject || file.name.replace(/\.[^.]+$/, ""), fit: photo.fit ?? (field.path === "logo" ? "contain" : "cover") });
          setNotice(c.uploaded);
        } catch (e) { setError(e instanceof Error && e.message === "quota" ? c.quota : c.uploadError); }
        finally { setBusy(false); }
      }} />
    </label>
    {(photo.src || !field.required && value) && <button type="button" disabled={blocked} onClick={() => { setNotice(""); onChange(field.required ? { subject: photo.subject } : null); }} className="ml-2 underline disabled:opacity-50">{field.required ? c.restore : c.remove}</button>}
    <p className="text-xs leading-relaxed text-muted">{c.formats}</p>
    {error && <p role="alert" className="text-warn">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {(value || photo.src) && <>
      <label className="block">{c.alt}<input className={fieldClass} value={photo.subject} required maxLength={500} disabled={blocked} onChange={e => update({ subject: e.target.value })} /></label>
      {photo.src && <>
        <label className="block">{c.fit}<select aria-label={c.fit} className={fieldClass} value={photo.fit ?? "cover"} disabled={blocked} onChange={e => update({ fit: e.target.value as Photo["fit"] })}><option value="cover">{c.cover}</option><option value="contain">{c.contain}</option></select></label>
        {photo.fit !== "contain" && (["positionX", "positionY"] as const).map(key => <label key={key} className="block">{key === "positionX" ? c.horizontal : c.vertical}<input type="range" min={0} max={100} value={photo[key] ?? 50} disabled={blocked} onChange={e => update({ [key]: Number(e.target.value) })} className="mt-1 w-full" /></label>)}
      </>}
    </>}
  </div>;
}
