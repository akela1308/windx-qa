"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

// Рамка бокового меню. На компьютере меню всегда слева,
// на телефоне сверху полоска с кнопкой, а меню выезжает шторкой.
// На компьютере меню можно свернуть: признак на <html data-sidebar>, хранится в браузере (см. корневой layout).
export function SidebarFrame({ children, labels, overlay }: {
  children: ReactNode; labels: { menu: string; close: string; collapse: string; expand: string }; overlay?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const collapse = (on: boolean) => {
    if (on) document.documentElement.dataset.sidebar = "collapsed";
    else delete document.documentElement.dataset.sidebar;
    try { localStorage.setItem("windx_sidebar", on ? "collapsed" : "open"); } catch {}
  };

  return (
    <>
      {overlay}
      <button
        type="button"
        onClick={() => collapse(false)}
        aria-label={labels.expand}
        title={labels.expand}
        className="sidebar-expand fixed left-3 top-3 z-30 hidden size-10 place-items-center rounded-full border border-line bg-bg text-muted transition-colors hover:border-ink hover:text-ink lg:grid"
      >
        <span aria-hidden="true">»</span>
      </button>
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={labels.menu}
          aria-expanded={open}
          className="grid size-10 place-items-center rounded-full border border-line transition-colors hover:border-ink"
        >
          <span className="flex w-4 flex-col gap-1" aria-hidden="true">
            <span className="h-0.5 rounded bg-ink" />
            <span className="h-0.5 rounded bg-ink" />
            <span className="h-0.5 rounded bg-ink" />
          </span>
        </button>
        <Logo />
      </div>

      {open && <div className="fixed inset-0 z-40 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside
        // Любой переход по ссылке в меню закрывает шторку на телефоне.
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        className={`sidebar fixed inset-y-0 left-0 z-50 flex w-[284px] flex-col border-r border-line bg-bg transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:shrink-0 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Logo />
          <button type="button" onClick={() => setOpen(false)} aria-label={labels.close} className="grid size-9 place-items-center rounded-full text-xl text-muted hover:text-ink lg:hidden">
            ×
          </button>
          <button type="button" onClick={() => collapse(true)} aria-label={labels.collapse} title={labels.collapse} className="hidden size-9 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink lg:grid">
            <span aria-hidden="true">«</span>
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight" aria-label="WINDX home">
      <span className="inline-block size-3.5 rounded-[3px] bg-brand ring-1 ring-ink" aria-hidden="true" />
      windx
    </Link>
  );
}

// Пункт меню с подсветкой текущей страницы.
export function NavLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  const path = usePathname();
  const active = href.split("?")[0] === path && !href.includes("?");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-ink/5 ${active ? "bg-ink/[0.07] font-medium text-ink" : "text-ink/80"} ${className}`}
    >
      {children}
    </Link>
  );
}
