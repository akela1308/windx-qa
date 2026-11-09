import { Suspense } from "react";
import { getDict } from "@/lib/i18n";
import { mailMode } from "@/lib/mail/transport";
import { SecurityForm } from "@/components/account/SecurityForm";
export const metadata = { title: "WINDX account", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
async function Form() {
  const { locale } = await getDict();
  const mode = mailMode();
  return <SecurityForm kind="reset" locale={locale} available={mode !== "disabled"} test={mode === "file"} />;
}
export default function Page() { return <main className="grid min-h-dvh place-items-center p-6"><Suspense fallback={<p>WINDX</p>}><Form /></Suspense></main>; }
