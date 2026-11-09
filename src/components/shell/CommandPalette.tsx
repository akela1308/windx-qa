"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export type PaletteItem = { group: string; label: string; href: string };

const OPEN_EVENT = "windx:search";

// Быстрый поиск, как у Lovable: Cmd+K (или Ctrl+K) с любой страницы кабинета.
// Ищет по сайтам, шаблонам, стилям и страницам; стрелки и Enter, Escape закрывает.
export function CommandPalette({ items, t }: { items: PaletteItem[]; t: { placeholder: string; empty: string; close: string } }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items).slice(0, 40);
  }, [items, query]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(0);
  };
  const go = (item?: PaletteItem) => {
    if (!item) return;
    close();
    router.push(item.href);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") close();
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, found.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter") go(found[active]);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/30 px-4 pt-[12vh]" onClick={close}>
      <div
        role="dialog"
        aria-label={t.placeholder}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-ink bg-panel shadow-[6px_6px_0_0_var(--shadow)]"
      >
        <input
          ref={input}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={onKey}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={found[active] ? `palette-${active}` : undefined}
          className="w-full border-b border-line bg-transparent px-5 py-4 text-base outline-none placeholder:text-muted"
        />
        <ul id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {found.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">{t.empty}</li>}
          {found.map((item, i) => (
            <li
              key={`${item.group}-${item.href}`}
              id={`palette-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm ${i === active ? "bg-ink/[0.07]" : ""}`}
            >
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 text-xs text-muted">{item.group}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Кнопка поиска в меню: открывает тот же поиск и подсказывает сочетание клавиш.
export function SearchButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-ink hover:text-ink"
    >
      <span aria-hidden="true">⌕</span>
      <span className="flex-1 text-left">{label}</span>
      <kbd className="rounded-md border border-line px-1.5 font-mono text-[11px]">⌘K</kbd>
    </button>
  );
}
