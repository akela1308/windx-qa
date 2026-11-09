import { Suspense } from "react";
import { Hero } from "@/components/home/Hero";
import { MySites } from "@/components/home/MySites";
import { getDict } from "@/lib/i18n";
import { isStyle } from "@/lib/showcase";
import { getStore } from "@/lib/storage";
import { templateBrief, templateIndex, TEMPLATE_STYLES } from "@/lib/templates";
import { currentUser } from "@/lib/auth/session";

// Главная: первый экран целиком под создание сайта, ниже недавние сайты владельца.
// Остальное (шаблоны, стили, как это работает) живёт в меню слева.
// ?style= выбирает стиль, ?t= подставляет описание из шаблона ниши.
export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const [{ locale, t }, params, sites] = await Promise.all([getDict(), searchParams, (await getStore()).listSites()]);
  const template = templateIndex(params.t);
  const style = isStyle(params.style) ? params.style : template !== undefined ? TEMPLATE_STYLES[template] : undefined;
  const styleName = style ? (t.styleNames as Record<string, string[]>)[style][0] : undefined;
  const recent = [...sites].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  return (
    <>
      <Hero t={t} locale={locale} style={style} styleName={styleName} brief={templateBrief(params.t)} template={template} trial={!await currentUser()} />
      {sites.length > 0 && <MySites t={t} locale={locale} sites={recent} />}
    </>
  );
}
