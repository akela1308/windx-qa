import Link from "next/link";
import { EmailStatus } from "@/components/account/EmailStatus";
import { securityCopy } from "@/lib/auth/security-copy";
import { mailMode } from "@/lib/mail/transport";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { accountSummary } from "@/lib/auth/accounts";
import { googleEnabled } from "@/lib/auth/google";
import { getDict } from "@/lib/i18n";
import { GoogleButton } from "@/components/GoogleButton";

type Props = { searchParams: Promise<{ google?: string }> };
async function Account({ searchParams }: Props) {
  const user = await requireUser();
  const [{ locale }, summary, params] = await Promise.all([getDict(), accountSummary(user), searchParams]);
  const ru = locale === "ru", mode = mailMode(), c = securityCopy(locale);
  return <section className="mx-auto w-full max-w-2xl px-5 py-12 md:px-10">
    <h1 className="text-3xl font-semibold">{ru ? "Аккаунт" : "Account"}</h1>
    <p className="mt-5 break-words text-lg">{summary.email}</p>
    <p className="mt-2 text-sm text-muted">{ru ? "Ваши сайты привязаны к этому аккаунту и доступны с любого устройства после входа." : "Your sites belong to this account. Sign in on any device to access them."}</p>
    <EmailStatus verified={summary.verified} available={mode !== "disabled"} test={mode === "file"} locale={locale} />
    <Link href="/forgot-password" className="mt-5 inline-block text-sm underline">{c.resetTitle}</Link>
    {params.google === "failed" && <p role="alert" className="mt-6 text-sm text-warn">{ru ? "Не удалось подключить Google. Выберите Google-аккаунт с той же почтой, что указана выше." : "Could not connect Google. Choose the Google account with the same email shown above."}</p>}
    <div className="mt-8 border-t border-line pt-6">
      <h2 className="text-lg font-medium">{ru ? "Вход через Google" : "Google sign-in"}</h2>
      {summary.googleLinked ? <p role="status" className="mt-3 text-muted">{ru ? "Google подключён. Вы можете входить без ввода пароля WINDX." : "Google is connected. You can sign in without entering your WINDX password."}</p>
        : googleEnabled() ? <div className="mt-4 max-w-sm"><GoogleButton link label={ru ? "Подключить Google" : "Connect Google"} /></div>
        : <p className="mt-3 text-muted">{ru ? "Вход через Google скоро появится." : "Google sign-in is coming soon."}</p>}
    </div>
  </section>;
}
export default function AccountPage(props: Props) { return <Suspense fallback={<div className="min-h-64 animate-pulse bg-bg" />}><Account {...props} /></Suspense>; }
