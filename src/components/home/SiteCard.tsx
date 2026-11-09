"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAction, duplicateAction, starAction } from "@/app/actions";
import { BackupDownload } from "./ProjectBackups";
import type { BackupCopy } from "@/lib/backups/copy";

export type CardLabels = {
  backup: BackupCopy;
  open: string; draft: string; live: string; more: string; delete: string; confirmDelete: string; cancel: string;
  star: string; unstar: string; duplicate: string; starred: string;
};

// Карточка сайта: статичная миниатюра текущей версии, статус, звёздочка избранного
// и меню: в избранное, сделать копию, удалить. Удаление только после подтверждения в самой карточке.
export function SiteCard({ id, name, version, meta, starred, live, guest = false, t }: { id: string; name: string; version: number; meta: string; starred: boolean; live: boolean; guest?: boolean; t: CardLabels }) {
  const [failure,setFailure]=useState("");
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const close = () => { setMenu(false); setConfirm(false); };
  const item = "w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-bg";

  return (
    <div className={`group relative ${pending ? "opacity-40" : ""}`}>
      <Link href={`/sites/${id}`} aria-label={`${t.open}: ${name}`} className="block">
        <div className="relative aspect-[16/11] overflow-hidden rounded-2xl border border-line bg-panel transition-[transform,border-color] duration-300 group-hover:-translate-y-1.5 group-hover:border-ink">
          {/* Миниатюра без внутренней прокрутки. Нажатие открывает редактор. */}
          <iframe
            src={`/preview/${id}/${version}?thumbnail=1`}
            title={name}
            loading="lazy"
            tabIndex={-1}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-[880px] w-[1280px] origin-top-left scale-[0.25] sm:scale-[0.24] lg:scale-[0.33]"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#121211] ring-1 ring-black/10">
            {live && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[#25d366] align-middle" aria-hidden="true" />}
            {live ? t.live : t.draft}
          </span>
        </div>
      </Link>
      {!guest && <button
        onClick={() => start(() => starAction(id, !starred))}
        aria-pressed={starred}
        aria-label={starred ? t.unstar : t.star}
        title={starred ? t.unstar : t.star}
        className={`absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white text-base ring-1 ring-black/10 transition-opacity ${starred ? "text-[#128c7e]" : "text-[#5d5d57] opacity-0 focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"}`}
      >
        {starred ? "★" : "☆"}
      </button>}
      <div className="mt-3 flex items-start justify-between gap-3">
        <Link href={`/sites/${id}`} className="min-w-0">
          <h3 className="truncate font-medium">{name}</h3>
          <p className="text-sm text-muted">{meta}</p>
        </Link>
        {!guest && <button
          onClick={() => { setMenu(!menu); setConfirm(false); }}
          aria-expanded={menu}
          aria-label={`${t.more}: ${name}`}
          className="grid size-11 shrink-0 place-items-center rounded-full text-lg leading-none text-muted transition-colors hover:bg-panel hover:text-ink"
        >
          ⋯
        </button>}
      </div>
      {menu && (
        <div className="absolute bottom-14 right-0 z-10 w-64 rounded-2xl border border-ink bg-panel p-2 shadow-[6px_6px_0_0_var(--shadow)]">
          {!confirm ? (
            <>
              <button onClick={() => { close(); start(() => starAction(id, !starred)); }} className={item}>
                {starred ? t.unstar : t.star}
              </button>
              <button
                onClick={() => { close(); start(async () => router.push(`/sites/${await duplicateAction(id)}`)); }}
                className={item}
              >
                {t.duplicate}
              </button>
              <button onClick={() => setConfirm(true)} className={`${item} text-warn`}>
                {t.delete}
              </button>
              <BackupDownload siteId={id} t={t.backup} className={item} />
            </>
          ) : (
            <div className="p-2">
              <p className="text-sm">{t.confirmDelete}</p>
              {failure&&<div role="alert" className="mt-2 text-sm text-warn"><p>{failure}</p><Link href={`/sites/${id}`} className="underline underline-offset-2">{t.open}</Link></div>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => start(async () => {setFailure("");const result=await deleteAction(id);if(!result.ok)setFailure(result.message);})}
                  className="rounded-full bg-warn px-3 py-1.5 text-sm font-medium text-white"
                >
                  {t.delete}
                </button>
                <button onClick={close} className="rounded-full border border-line px-3 py-1.5 text-sm">
                  {t.cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
