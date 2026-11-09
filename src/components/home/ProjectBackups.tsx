"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { backupCopy, backupErrorText, type BackupCopy } from "@/lib/backups/copy";
import { MAX_BACKUP } from "@/lib/backups/limits";
import type { BackupSummary } from "@/lib/backups/format";

export function BackupDownload({siteId, t, className}: {siteId: string; t: BackupCopy; className?: string}) {
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  async function download() {
    setPending(true); setError("");
    try {
      const r = await fetch(`/sites/${siteId}/backup`, {cache: "no-store"});
      if (!r.ok) throw new Error((await r.json()).error);
      const url = URL.createObjectURL(await r.blob()), a = document.createElement("a");
      a.href = url; a.download = `windx-${siteId}-${new Date().toISOString().slice(0,10)}.windx.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) { setError(backupErrorText((e as Error).message, t)); }
    finally { setPending(false); }
  }
  return <div><button type="button" disabled={pending} onClick={download} className={className}>{pending ? t.downloading : t.download}</button>{error && <p role="alert" className="px-3 py-2 text-sm text-warn">{error}</p>}</div>;
}
export function ProjectBackups({locale}: {locale: string}) {
  const t = backupCopy(locale), router = useRouter(), input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false), [file, setFile] = useState<File | null>(null), [summary, setSummary] = useState<BackupSummary | null>(null), [pending, setPending] = useState(false), [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  function close() { setOpen(false); setFile(null); setSummary(null); setError(""); }
  async function submit(restore: boolean) {
    if (!file) return;
    setPending(true); setError("");
    try {
      if (file.size > MAX_BACKUP) throw new Error("size");
      const r = await fetch(`/sites/restore?mode=${restore ? "restore" : "review"}`, {method: "POST", headers: {"content-type": "application/json", ...(restore ? {"x-windx-confirm-backup": "1", "x-windx-restore-id": requestId} : {})}, body: file});
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      if (restore) { close(); router.push(`/sites/${result.id}`); router.refresh(); }
      else setSummary(result.summary);
    } catch (e) { setError(backupErrorText((e as Error).message, t)); }
    finally { setPending(false); }
  }
  const button = "min-h-11 rounded-full border border-line px-4 py-2 text-sm disabled:opacity-50";
  return <div className="mt-6">
    {!open ? <button className={button} onClick={() => setOpen(true)}>{t.open}</button> : <section aria-label={t.title} className="max-w-2xl rounded-2xl border border-line bg-panel p-5">
      <h3 className="font-medium">{t.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted">{t.help}</p><p className="mt-3 text-sm leading-relaxed text-muted">{t.excluded}</p>
      <label className="mt-5 block text-sm font-medium">{t.file}<input ref={input} type="file" accept=".json,application/json" disabled={pending} onChange={e => {setFile(e.target.files?.[0] ?? null); setRequestId(crypto.randomUUID()); setSummary(null); setError("");}} className="mt-2 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-full file:border file:border-line file:bg-bg file:px-4" /></label>
      <p className="mt-2 text-sm text-muted">{t.size}</p>
      {summary && <div className="mt-5 border-t border-line pt-4"><p className="break-words font-medium">{summary.name}</p><p className="mt-2 text-sm">{t.versions}: {summary.versions}. {t.images}: {summary.images}. {t.current}: {summary.currentVersion}.</p><p className="mt-3 text-sm leading-relaxed">{t.reviewHelp}</p>{summary.customCode && <p role="note" className="mt-3 text-sm text-warn">{t.code}</p>}</div>}
      {error && <p role="alert" className="mt-3 text-sm text-warn">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-3"><button disabled={!file || pending} className={button} onClick={() => submit(!!summary)}>{pending ? summary ? t.restoring : t.checking : summary ? t.restore : t.review}</button><button disabled={pending} className={button} onClick={close}>{t.cancel}</button></div>
    </section>}
  </div>;
}
