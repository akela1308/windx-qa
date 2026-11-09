"use client";

import { useMemo, useState } from "react";
import { SiteCard, type CardLabels } from "./SiteCard";

export type SiteItem = { id: string; name: string; version: number; meta: string; updatedAt: string; createdAt: string; starred: boolean; live: boolean; guest?: boolean };
type Sort = "recent" | "name" | "created";
type Labels = CardLabels & { sitesEmpty: string; search: string; sortRecent: string; sortName: string; sortCreated: string; noMatch: string };

// Сетка сайтов. С controls сверху поиск по названию и сортировка; избранные всегда первыми.
export function SitesGrid({ items, t, controls }: { items: SiteItem[]; t: Labels; controls: boolean }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((s) => !q || s.name.toLowerCase().includes(q));
    const by: Record<Sort, (a: SiteItem, b: SiteItem) => number> = {
      recent: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
      name: (a, b) => a.name.localeCompare(b.name),
      created: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return list.sort((a, b) => Number(b.starred) - Number(a.starred) || by[sort](a, b));
  }, [items, query, sort]);

  return (
    <>
      {controls && items.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            aria-label={t.search}
            className="min-w-0 flex-1 rounded-full border border-line bg-panel px-4 py-2.5 text-sm outline-none focus:border-ink sm:max-w-sm"
          />
          <label className="relative inline-flex shrink-0 items-center">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label={t.sortRecent}
            className="cursor-pointer appearance-none rounded-full border border-line bg-panel py-2.5 pl-4 pr-10 text-sm leading-normal outline-none transition-colors hover:border-ink focus-visible:ring-2 focus-visible:ring-ink"
          >
            <option value="recent">{t.sortRecent}</option>
            <option value="name">{t.sortName}</option>
            <option value="created">{t.sortCreated}</option>
          </select>
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="pointer-events-none absolute right-4 size-3.5 text-ink">
            <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          </label>
        </div>
      )}
      {controls && query && shown.length === 0 && <p className="mt-8 text-muted">{t.noMatch}</p>}
      {items.length === 0 && <p className="mt-8 text-muted">{t.sitesEmpty}</p>}
      <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((s) => (
          <li key={s.id}>
            <SiteCard id={s.id} name={s.name} version={s.version} meta={s.meta} starred={s.starred} live={s.live} guest={s.guest} t={t} />
          </li>
        ))}
      </ul>
    </>
  );
}
