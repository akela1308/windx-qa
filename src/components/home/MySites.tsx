import { fmt, type Dict } from "@/lib/i18n";
import type { Site } from "@/lib/storage";
import { SitesGrid, type SiteItem } from "./SitesGrid";
import { ProjectBackups } from "./ProjectBackups";
import { backupCopy } from "@/lib/backups/copy";

// Сайты владельца: карточки с превью, скачивание копии и восстановление проекта.
// На странице «Мои сайты» (full) сверху поиск и сортировка, как у Lovable.
export function MySites({ t, locale, sites, full = false }: { t: Dict; locale: string; sites: Site[]; full?: boolean }) {
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { day: "numeric", month: "short", year: "numeric" });
  const items: SiteItem[] = sites.map((s) => ({
    id: s.id,
    name: s.name,
    version: s.currentVersion,
    meta: `${fmt(t.sites.version, { n: s.currentVersion })}, ${date.format(new Date(s.updatedAt))}`,
    updatedAt: s.updatedAt,
    createdAt: s.createdAt,
    starred: !!s.starred,
    live: !!s.published,
    guest: s.ownerId?.startsWith("guest-"),
  }));
  const labels = {
    backup: backupCopy(locale),
    open: t.home.open, draft: t.home.draft, more: t.home.more, delete: t.home.delete, confirmDelete: t.home.confirmDelete, cancel: t.home.cancel,
    newSite: t.home.newSite, sitesEmpty: t.home.sitesEmpty,
    live: t.publishing.live, star: t.tools.star, unstar: t.tools.unstar, duplicate: t.tools.duplicate, starred: t.tools.starred,
    search: t.tools.searchSites, sortRecent: t.tools.sortRecent, sortName: t.tools.sortName, sortCreated: t.tools.sortCreated, noMatch: t.tools.noMatch,
  };
  return (
    <section id="sites" className="mx-auto w-full max-w-[1400px] px-5 py-12 md:px-10 md:py-16">
      <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{t.home.sitesTitle}</h2>
      {full && <ProjectBackups locale={locale} />}
      <SitesGrid items={items} t={labels} controls={full} />
    </section>
  );
}
