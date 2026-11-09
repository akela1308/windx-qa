"use client";
import { useEffect, useState } from "react";
import { codeDraftKey, readCodeDraft, writeCodeDraft, type CodeDraft, type CodeValues } from "@/lib/editor-drafts/code";

export function useCodeDraft(owner: string | undefined, site: string, baseVersion: number, review: boolean) {
  const key = owner ? codeDraftKey(owner, site) : null;
  const [ready, setReady] = useState(false);
  const [candidate, setCandidate] = useState<CodeDraft | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "unavailable">("idle");
  useEffect(() => {
    try {
      const draft = key ? readCodeDraft(window.localStorage, key) : null;
      // Инициализация browser-only данных после hydration; SSR не обращается к localStorage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCandidate(draft);
    } catch { setStatus("unavailable"); }
    setReady(true);
  }, [key]);
  const clear = () => {
    try { if (key) window.localStorage.removeItem(key); setStatus("idle"); }
    catch { setStatus("unavailable"); }
    setCandidate(null);
  };
  useEffect(() => {
    // Готовое предложение уже хранится на сервере. Локальный ввод не должен воскреснуть после применения/отмены.
    if (!ready || !review) return;
    try { if (key) window.localStorage.removeItem(key); } catch { /* Серверное предложение уже сохранено. */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCandidate(null); setStatus("idle");
  }, [ready, review, key]);
  const save = (selection: string, values: CodeValues) => {
    if (!ready || candidate || review) return;
    try {
      if (!key) throw new Error("No owner scope");
      writeCodeDraft(window.localStorage, key, { format: 1, selection, baseVersion, savedAt: Date.now(), values });
      setStatus("saved");
    } catch { setStatus("unavailable"); }
  };
  return { ready, candidate, status, save, clear, restore: () => { setCandidate(null); setStatus("saved"); } };
}
