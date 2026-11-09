"use client";

import { loginCopy } from "@/lib/auth/login-copy";
import { securityCopy } from "@/lib/auth/security-copy";
import { useActionState, useState } from "react";
import Link from "next/link";
import { GoogleButton } from "@/components/GoogleButton";
import { loginAction } from "./actions";

export function LoginForm({ locale, google, googleError, mailAvailable = false, initialRegister = false, next = "/sites" }: { mailAvailable?: boolean; locale: string; google: boolean; googleError: boolean; initialRegister?: boolean; next?: string }) {
  const [register, setRegister] = useState(initialRegister);
  const [showPassword, setShowPassword] = useState(false);
  const copy = securityCopy(locale);
  const c = loginCopy(locale);
  const [error, action, pending] = useActionState(loginAction, "");
  const input = "mt-2 h-12 w-full rounded-xl border border-line bg-panel px-4 text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink";
  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="text-xl font-bold">windx</Link>
      <h1 className="mt-8 text-3xl font-semibold">{register ? c.register : c.title}</h1>
      <p className="mt-3 text-sm text-muted">{c.intro}</p>
      {googleError && <p role="alert" className="mt-4 text-sm text-warn">{c.googleError}</p>}
      {google && <div className="mt-6"><GoogleButton label={c.google} /></div>}
      <form action={action} className="mt-6 space-y-5">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="mode" value={register ? "register" : "login"} />
        <input type="hidden" name="locale" value={locale} />
        <label className="block text-sm">{c.email}<input className={input} name="email" type="email" autoComplete="username" maxLength={254} required /></label>
        <div>
          <label className="block text-sm">{c.password}<input className={input} name="password" type={showPassword ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} minLength={register ? 8 : undefined} maxLength={128} required /></label>
          <button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="mt-1 min-h-11 rounded px-1 text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">{showPassword ? copy.hidePassword : copy.showPassword}</button>
        </div>
        {register && <>
          <p className="text-sm text-muted">{c.hint}</p>
          <p className="text-sm text-muted">{mailAvailable ? c.mail : c.noMail}</p>
          <label className="block text-sm">{c.invitation}<input className={input} name="invitation" type="password" autoComplete="off" maxLength={128} /></label>
        </>}
        {error && <p role="alert" className="text-sm text-warn">{error}</p>}
        <button disabled={pending} className="h-12 w-full rounded-full bg-brand font-medium text-on-brand ring-1 ring-ink disabled:opacity-50">{pending ? c.working : register ? c.register : c.signIn}</button>
      </form>
      {!register && <Link href="/forgot-password" className="mt-4 block text-sm underline">{securityCopy(locale).forgot}</Link>}
      <button type="button" disabled={pending} onClick={() => {setRegister(!register); setShowPassword(false);}} className="mt-5 text-sm underline underline-offset-4">{register ? c.existing : c.newAccount}</button>
    </div>
  );
}
