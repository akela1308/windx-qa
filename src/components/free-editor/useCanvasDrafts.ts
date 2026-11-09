"use client";
import { useEffect, useRef, useState } from "react";
import { canvasDraftScope, canvasDraftKey, readCanvasDrafts, writeCanvasDraft, type CanvasDraft } from "@/lib/editor-drafts/canvas";

export function useCanvasDrafts({ owner, site, sectionId, version, doc, after, links, device, selected, dirty, reviewing, blocked }: {
  owner?: string; site: string; sectionId: string | null; version: number;
  doc: CanvasDraft["doc"]; after: string; links: Record<string,string>; device: CanvasDraft["device"]; selected: string | null;
  dirty: boolean; reviewing: boolean; blocked: boolean;
}) {
  const scope = owner ? canvasDraftScope(owner, site) : null;
  const [ready, setReady] = useState(false);
  const [drafts, setDrafts] = useState<CanvasDraft[]>([]);
  const [status, setStatus] = useState<"idle" | "saved" | "unavailable">("idle");
  const wasDirty = useRef(false);
  useEffect(() => {
    try {
      // Browser-only чтение после hydration, без записи начального пустого холста поверх копии.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDrafts(scope ? readCanvasDrafts(window.localStorage, scope, site) : []);
    } catch { setStatus("unavailable"); }
    setReady(true);
  }, [scope, site]);
  const candidate = drafts.find(d => d.sectionId === sectionId);
  useEffect(() => {
    if (!ready || blocked) return;
    if (reviewing) {
      try { if (scope) window.localStorage.removeItem(canvasDraftKey(scope, sectionId)); } catch { /* Предложение уже хранится на сервере. */ }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDrafts(old => old.filter(d => d.sectionId !== sectionId)); setStatus("idle"); wasDirty.current = false;
      return;
    }
    if (candidate) return;
    if (!dirty && !wasDirty.current) return;
    try {
      if (!scope) throw new Error("No owner scope");
      if (dirty) writeCanvasDraft(window.localStorage, scope, site, {format:1,baseVersion:version,sectionId,savedAt:Date.now(),doc,after,links,device,selected});
      else window.localStorage.removeItem(canvasDraftKey(scope, sectionId));
      setStatus(dirty ? "saved" : "idle");
    } catch { setStatus("unavailable"); }
    wasDirty.current = dirty;
  }, [ready, scope, site, sectionId, version, doc, after, links, device, selected, dirty, reviewing, blocked, candidate]);
  const clear = (target: string | null) => {
    try { if (scope) window.localStorage.removeItem(canvasDraftKey(scope, target)); setStatus("idle"); }
    catch { setStatus("unavailable"); }
    setDrafts(old => old.filter(d => d.sectionId !== target));
  };
  return { ready, drafts, candidate, status, clear, restore: () => { setDrafts(old => old.filter(d => d.sectionId !== sectionId)); } };
}
