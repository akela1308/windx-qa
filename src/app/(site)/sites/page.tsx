import { Suspense } from "react";
import { MySites } from "@/components/home/MySites";
import { getDict } from "@/lib/i18n";
import { getStore } from "@/lib/storage";

// Все сайты владельца (пункт «Мои сайты» в меню).
export default function SitesPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <SitesContent />
    </Suspense>
  );
}

async function SitesContent() {
  const [{ locale, t }, sites] = await Promise.all([getDict(), (await getStore()).listSites()]);
  const sorted = [...sites].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <MySites t={t} locale={locale} sites={sorted} full />;
}
