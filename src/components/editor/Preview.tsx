"use client";

import { contentCopy } from "@/lib/content/copy";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Device, EditorData, EditorT, Picked } from "./Editor";

const PreviewFrame = dynamic(() => import("./PreviewFrame").then(m => m.PreviewFrame), { ssr: false });

// Живое превью текущей версии сайта и панель над ним: выбор блока, обновить,
// открыть в новой вкладке, скопировать ссылку. На телефоне превью во всю ширину.
export function Preview({ data, device, t, selecting, setSelecting, picked, onPick, onEdit }: {
  data: EditorData; device: Device; t: EditorT;
  selecting: boolean; setSelecting: (on: boolean) => void; picked: Picked | null; onPick: (p: Picked) => void; onEdit: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [reload, setReload] = useState(0);
  const [copied, setCopied] = useState(false);
  const path = `/preview/${data.siteId}/${data.currentVersion}`;
  const source = `${path}${data.guest ? "" : "?edit=1"}`;
  const loadKey = `${source}:${reload}`;
  const [loadedKey, setLoadedKey] = useState("");
  const [failedKey, setFailedKey] = useState("");
  const fail = useCallback(() => setFailedKey(loadKey), [loadKey]);
  const tt = t.tools;

  // Сообщаем странице внутри iframe режим выбора и выбранный блок.
  const sync = () => {
    const win = frame.current?.contentWindow;
    win?.postMessage({ windx: "mode", on: selecting }, location.origin);
    win?.postMessage({ windx: "picked", index: picked?.index ?? -1 }, location.origin);
  };
  useEffect(sync);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return;
      if (e.data?.windx === "ready") {
        setLoadedKey(loadKey);
        sync();
      }
      if (!data.guest && e.data?.windx === "pick" && Number.isInteger(e.data.index) && e.data.index >= 0) {
        onPick({ index: e.data.index, composition: String(e.data.composition ?? "") });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.origin + path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.open(path, "_blank");
    }
  };

  const tool = "grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-ink/5 hover:text-ink";
  return (
    <section className="order-1 flex h-[58dvh] shrink-0 flex-col bg-bg p-3 lg:order-2 lg:h-auto lg:min-h-0 lg:p-5 lg:pt-3">
      <div className="mb-2 flex items-center gap-1.5 lg:mb-3">
        {!data.guest && <button
          onClick={() => setSelecting(!selecting)}
          aria-pressed={selecting}
          title={tt.selectHint}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${selecting ? "border-ink bg-ink text-bg" : "border-line text-ink hover:border-ink"}`}
        >
          <span aria-hidden="true" className={`inline-block size-3 rounded-[3px] border-2 border-dashed ${selecting ? "border-brand" : "border-ink/60"}`} />
          {tt.select}
        </button>}
        {!data.guest && <button onClick={onEdit} className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-ink">{contentCopy(data.locale).tab}</button>}
        {selecting && <span className="hidden truncate text-xs text-muted md:inline">{tt.selectHint}</span>}
        <div className="ml-auto flex items-center gap-0.5">
          {copied && <span className="mr-1 text-xs text-muted" role="status">{tt.copied}</span>}
          <button onClick={() => setReload((r) => r + 1)} className={tool} aria-label={tt.reload} title={tt.reload}>
            <span aria-hidden="true" className="text-base leading-none">↻</span>
          </button>
          <a href={path} target="_blank" rel="noopener" className={tool} aria-label={tt.openTab} title={tt.openTab}>
            <span aria-hidden="true" className="text-sm leading-none">↗</span>
          </a>
          <button onClick={copy} className={tool} aria-label={tt.copyLink} title={tt.copyLink}>
            <span aria-hidden="true" className="text-sm leading-none">⧉</span>
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 justify-center">
        <PreviewFrame
          frameRef={frame}
          onError={fail}
          src={source}
          onLoad={() => { setLoadedKey(loadKey); sync(); }}
          key={`${data.siteId}-${data.currentVersion}-${reload}`}
          title={`${data.name}, version ${data.currentVersion}`}
          className={`h-full w-full rounded-xl border bg-white shadow-[6px_6px_0_0_var(--shadow)] transition-[max-width] duration-300 ${selecting ? "border-brand-deep" : "border-ink"}`}
          style={{ maxWidth: device === "phone" ? 390 : "100%" }}
        />
        {loadedKey !== loadKey && (
          <div role="status" className="absolute inset-0 grid place-items-center rounded-xl border border-ink bg-white text-sm text-muted" style={{ maxWidth: device === "phone" ? 390 : "100%", marginInline: "auto" }}>
            {failedKey === loadKey ? tt.previewFailed : t.working}
          </div>
        )}
      </div>
    </section>
  );
}
