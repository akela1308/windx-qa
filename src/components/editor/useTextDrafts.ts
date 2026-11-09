"use client";
import { useEffect, useState } from "react";
import { readTextDrafts, textDraftScope, textDraftKey, writeTextDraft, type TextDraft } from "@/lib/editor-drafts/text";

export function useTextDrafts(owner: string | undefined, site: string, version: number, submitted: boolean, index: number) {
  const scope = owner ? textDraftScope(owner, site) : null;
  const [ready, setReady] = useState(false);
  const [drafts, setDrafts] = useState<TextDraft[]>([]);
  const [status, setStatus] = useState<"idle" | "saved" | "unavailable">("idle");
  const load = () => {
    try { setDrafts(scope ? readTextDrafts(window.localStorage, scope) : []); }
    catch { setStatus("unavailable"); }
  };
  useEffect(() => {
    try {
      // Browser-only копии читаются после hydration, не в серверном рендере.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDrafts(scope ? readTextDrafts(window.localStorage, scope) : []);
    } catch { setStatus("unavailable"); }
    setReady(true);
  }, [scope]);
  useEffect(() => {
    if (!ready || !submitted) return;
    // Очищаем только раздел собственного готового предложения, не остальные черновики.
    try { if (scope) window.localStorage.removeItem(textDraftKey(scope, index)); } catch { /* Предложение уже на сервере. */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrafts(old => old.filter(d => d.index !== index)); setStatus("idle");
  }, [ready, submitted, scope, index]);
  const clear = (section: number) => {
    try { if (scope) window.localStorage.removeItem(textDraftKey(scope, section)); setStatus("idle"); }
    catch { setStatus("unavailable"); }
    setDrafts(old => old.filter(d => d.index !== section));
  };
  const save = (section: number, composition: string, changes: TextDraft["changes"]) => {
    if (!ready || submitted) return;
    if (!changes.length) { clear(section); return; }
    try {
      if (!scope) throw new Error("No owner scope");
      writeTextDraft(window.localStorage, scope, { format: 1, baseVersion: version, index: section, composition, changes, savedAt: Date.now() });
      setStatus("saved");
    } catch { setStatus("unavailable"); }
  };
  return { ready, drafts, status, load, clear, save, restore: (section: number) => { setDrafts(old => old.filter(d => d.index !== section)); setStatus("saved"); } };
}
