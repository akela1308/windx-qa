import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getDict, LOCALES } from "@/lib/i18n";
import { SHOWCASE } from "@/lib/showcase";
import { getStore } from "@/lib/storage";
import { CommandPalette, SearchButton, type PaletteItem } from "./CommandPalette";
import { NavLink, SidebarFrame } from "./SidebarFrame";
import { ThemeToggle } from "./ThemeToggle";
import { accountSummary } from "@/lib/auth/accounts";
import { securityCopy } from "@/lib/auth/security-copy";
import { currentUser } from "@/lib/auth/session";
import { LogoutForm } from "./LogoutForm";

// Боковое меню кабинета, как у Lovable: главное действие сверху,
// поиск по Cmd+K, дальше раскрывающиеся шторки «Избранное», «Мои сайты», «Шаблоны», «Стили».
export async function Sidebar() {
  const [{ locale, t }, sites] = await Promise.all([getDict(), (await getStore()).listSites()]);
  const s = t.shell;
  const user = await currentUser();
  const summary = user ? await accountSummary(user).catch(() => null) : null;
  const names = t.styleNames as Record<string, string[]>;
  const options = Object.entries(LOCALES).map(([code, d]) => ({ code, name: d.langName }));
  const recent = [...sites].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const starred = sites.filter((x) => x.starred).sort((a, b) => a.name.localeCompare(b.name));
  const tt = t.tools;
  // Всё, что можно найти через поиск (Cmd+K).
  const palette: PaletteItem[] = [
    ...sites.map((x) => ({ group: t.nav.sites, label: x.name, href: `/sites/${x.id}` })),
    ...t.home.trades.map((trade, i) => ({ group: s.templates, label: trade, href: `/templates/${i}` })),
    ...SHOWCASE.map((id) => ({ group: s.looks, label: names[id][0], href: `/examples/${id}` })),
    ...[[s.home, "/"], [t.nav.sites, "/sites"], [s.templates, "/templates"], [s.how, "/how"]].map(([label, href]) => ({ group: tt.pages, label, href })),
  ];

  return (
    <SidebarFrame
      labels={{ menu: s.menu, close: s.close, collapse: tt.collapse, expand: tt.expand }}
      overlay={<CommandPalette items={palette} t={{ placeholder: tt.searchPlaceholder, empty: tt.noResults, close: s.close }} />}
    >
      <div className="flex flex-col gap-2 px-4">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-on-brand ring-1 ring-ink transition-transform active:scale-[0.98]"
        >
          <span aria-hidden="true" className="text-base leading-none">+</span>
          {s.newSite}
        </Link>
        <SearchButton label={tt.search} />
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
        <NavLink href="/">{s.home}</NavLink>

        {starred.length > 0 && (
          <Drawer title={tt.starred} open count={starred.length}>
            {starred.map((site) => (
              <NavLink key={site.id} href={`/sites/${site.id}`}>
                <span className="shrink-0 text-xs text-brand-deep" aria-hidden="true">★</span>
                <span className="truncate">{site.name}</span>
              </NavLink>
            ))}
          </Drawer>
        )}

        <Drawer title={t.nav.sites} open count={sites.length}>
          {recent.length === 0 && <p className="px-3 py-1.5 text-sm text-muted">{s.noSites}</p>}
          {recent.map((site) => (
            <NavLink key={site.id} href={`/sites/${site.id}`}>
              <span className="size-1.5 shrink-0 rounded-full bg-ink/30" aria-hidden="true" />
              <span className="truncate">{site.name}</span>
            </NavLink>
          ))}
          {sites.length > 0 && <More href="/sites">{s.allSites}</More>}
        </Drawer>

        <NavLink href="/templates">{s.templates}<span className="ml-auto" aria-hidden="true">↗</span></NavLink>
        <NavLink href="/templates#looks">{s.looks}<span className="ml-auto" aria-hidden="true">↗</span></NavLink>

        <div className="mt-2 border-t border-line pt-2">
          <NavLink href="/how">{s.how}</NavLink>
        </div>
      </nav>

      <div className="shrink-0 border-t border-line px-5 pt-3">
        {user ? <>
        <Link href="/account" className="block py-1 text-sm font-medium underline-offset-4 hover:underline">{locale === "ru" ? "Аккаунт" : locale === "es" ? "Cuenta" : "Account"}</Link>
        <p className="truncate text-xs text-muted">{user.email}</p>
        {summary && !summary.verified && <Link href="/account" className="mt-1 block text-xs underline underline-offset-4">{securityCopy(locale).unverified}</Link>}
        <LogoutForm label={locale === "ru" ? "Выйти" : locale === "es" ? "Cerrar sesión" : "Sign out"} />
        </> : <Link href="/login?mode=register" className="block py-2 text-sm font-medium">{t.trial.register}</Link>}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 px-5 pb-4 pt-2">
        <LanguageSwitcher current={locale} options={options} label={t.nav.language} />
        <ThemeToggle dark={tt.dark} light={tt.light} />
      </div>
    </SidebarFrame>
  );
}

// Шторка: заголовок раскрывает и сворачивает список (без JavaScript, через <details>).
function Drawer({ title, open = false, count, children }: { title: string; open?: boolean; count?: number; children: ReactNode }) {
  return (
    <details open={open} className="group mt-1">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-ink/5 [&::-webkit-details-marker]:hidden">
        <span className="inline-block text-muted transition-transform group-open:rotate-90" aria-hidden="true">›</span>
        {title}
        {count ? <span className="ml-auto rounded-full bg-ink/[0.07] px-2 text-xs text-muted">{count}</span> : null}
      </summary>
      <div className="ml-3 flex flex-col border-l border-line pl-2">{children}</div>
    </details>
  );
}

function More({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="px-3 py-1.5 text-sm text-muted underline-offset-2 hover:text-ink hover:underline">
      {children}
    </Link>
  );
}
