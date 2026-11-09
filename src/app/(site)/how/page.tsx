import { Suspense } from "react";
import { Checks } from "@/components/home/Checks";
import { EditShowcase } from "@/components/home/EditShowcase";
import { Faq } from "@/components/home/Faq";
import { Footer, NoBadge } from "@/components/home/NoBadge";
import { Trades } from "@/components/home/Trades";
import { getDict } from "@/lib/i18n";

// «Как это работает»: правки просьбами, три проверки, вопросы, обещание без значка.
export default function HowPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <HowContent />
    </Suspense>
  );
}

async function HowContent() {
  const { t } = await getDict();
  return (
    <>
      <EditShowcase t={t} />
      <Trades trades={t.home.trades} />
      <Checks t={t} />
      <Faq t={t} />
      <NoBadge t={t} />
      <Footer t={t} />
    </>
  );
}
