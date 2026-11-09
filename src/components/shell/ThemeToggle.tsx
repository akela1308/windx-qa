"use client";

import { useSyncExternalStore } from "react";

// Переключатель светлой и тёмной темы. Выбор хранится в браузере (localStorage),
// тему до отрисовки ставит скрипт в корневом layout.
const subscribe = (cb: () => void) => {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
};
const isDark = () => document.documentElement.dataset.theme === "dark";

export function ThemeToggle({ dark, light }: { dark: string; light: string }) {
  const on = useSyncExternalStore(subscribe, isDark, () => false);
  const toggle = () => {
    const next = !on;
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem("windx_theme", next ? "dark" : "light"); } catch {}
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? light : dark}
      title={on ? light : dark}
      className="grid size-9 place-items-center rounded-full border border-line text-sm transition-colors hover:border-ink"
    >
      <span aria-hidden="true">{on ? "☀" : "☾"}</span>
    </button>
  );
}
