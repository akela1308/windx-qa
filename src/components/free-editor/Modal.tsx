"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { styles } from "./styles";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("textarea,button,input,select")?.focus();
    return () => previous?.focus();
  }, []);
  return <div className={styles.backdrop}><section ref={ref} role="dialog" aria-modal="true" aria-label={title} className={styles.dialog} onKeyDown={(event) => {
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); onClose(); }
    if (event.key !== "Tab") return;
    const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>("button:not(:disabled),input,textarea,select") ?? []);
    const first = elements[0], last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>{children}</section></div>;
}
