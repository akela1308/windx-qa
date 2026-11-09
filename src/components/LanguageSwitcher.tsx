"use client";

import { useTransition } from "react";
import { setLanguage } from "@/app/actions";

export function LanguageSwitcher({ current, options, label }: { current: string; options: { code: string; name: string }[]; label: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="relative inline-flex shrink-0 items-center text-sm">
      <span className="sr-only">{label}</span>
      <select
        className="h-9 cursor-pointer appearance-none rounded-full border border-line bg-transparent pl-3 pr-9 text-sm leading-normal text-ink outline-none transition-colors hover:border-ink focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-wait disabled:opacity-50"
        value={current}
        disabled={pending}
        onChange={(e) => start(() => setLanguage(e.target.value))}
      >
        {options.map((o) => (
          <option key={o.code} value={o.code}>{o.name}</option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        className="pointer-events-none absolute right-3 size-3.5 text-ink"
      >
        <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
