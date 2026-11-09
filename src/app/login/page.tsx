import { mailMode } from "@/lib/mail/transport";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n";
import { LoginForm } from "./LoginForm";
import { googleEnabled } from "@/lib/auth/google";
import { returnPath } from "@/lib/auth/return-path";

export const metadata = { title: "Sign in | WINDX", robots: { index: false, follow: false } };
type Props = { searchParams: Promise<{ google?: string; mode?: string; next?: string }> };
async function Form({ searchParams }: Props) {
  const params = await searchParams;
  if (await currentUser()) redirect(returnPath(params.next));
  const { locale } = await getDict();
  return <LoginForm mailAvailable={mailMode() !== "disabled"} locale={locale} google={googleEnabled()} googleError={!!params.google} initialRegister={params.mode === "register"} next={returnPath(params.next)} />;
}
export default function LoginPage(props: Props) {
  return <main className="grid min-h-dvh place-items-center p-6"><Suspense fallback={<p>WINDX</p>}><Form {...props} /></Suspense></main>;
}
