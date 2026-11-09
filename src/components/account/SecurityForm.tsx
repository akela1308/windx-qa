"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { useFragmentToken } from "./fragment-token";
import { requestResetAction, resetPasswordAction, verifyEmailAction, switchVerificationAccountAction, type SecurityState } from "@/app/security-actions";
import { securityCopy } from "@/lib/auth/security-copy";
export function SecurityForm({ kind, locale, available, test }: { kind: "forgot" | "reset" | "verify"; locale: string; available: boolean; test: boolean }) {
  const c = securityCopy(locale);
  const fragment = useFragmentToken();
  const token = fragment ?? "";
  const loaded = kind === "forgot" || fragment !== null;
  const [local, setLocal] = useState<SecurityState>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""), [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const action = kind === "forgot" ? requestResetAction : kind === "reset" ? resetPasswordAction : verifyEmailAction;
  const [state, submit, pending] = useActionState(action, "idle" as SecurityState);
  const [switchState, switchAccount, switching] = useActionState(switchVerificationAccountAction, "idle" as SecurityState);
  const title = kind === "verify" ? c.verifyTitle : c.resetTitle;
  const intro = kind === "forgot" ? c.forgotIntro : kind === "verify" ? c.verifyIntro : c.passwordHint;
  const effective = local !== "idle" ? local : state === "wrongAccount" && switchState === "signIn" ? "signIn" : state;
  const success = state === "done";
  const invalidLink = loaded && kind !== "forgot" && !token;
  const message = (effective === "requested" ? c.requested : effective === "done" ? kind === "reset" ? c.resetDone : c.verifyDone : effective === "idle" ? "" : c[effective]).replace("{count}", String(password.length));
  const passwordError = effective === "passwordShort" || effective === "passwordLong";
  const confirmError = effective === "mismatch";
  const field = "mt-2 min-h-12 w-full rounded-xl border border-line bg-panel px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ink";
  return <div className="w-full max-w-md">
    <Link href="/" className="text-xl font-bold">windx</Link>
    <h1 className="mt-8 text-3xl font-semibold">{title}</h1><p className="mt-3 text-sm leading-relaxed text-muted">{intro}</p>
    {test && <p role="status" className="mt-4 rounded-lg border border-line p-3 text-sm">{c.local}</p>}
    {kind === "forgot" && !available && <p role="status" className="mt-5 rounded-lg border border-line p-3 text-sm">{c.unavailable}</p>}
    {invalidLink && <p role="alert" className="mt-5 text-warn">{c.invalid}</p>}
    {!success && !invalidLink && <form action={submit} noValidate className="mt-6 space-y-4" onSubmit={event => {
      let error: SecurityState = "idle";
      if (kind === "forgot") { const input = event.currentTarget.elements.namedItem("email") as HTMLInputElement; if (!email.trim() || !input.validity.valid) error = "invalidEmail"; }
      if (kind === "reset") error = password.length < 8 ? "passwordShort" : password.length > 128 ? "passwordLong" : password !== confirm ? "mismatch" : "idle";
      setLocal(error); if (error !== "idle") {
        event.preventDefault();
        const name = kind === "forgot" ? "email" : error === "mismatch" ? "confirm" : "password";
        (event.currentTarget.elements.namedItem(name) as HTMLInputElement)?.focus();
      }
    }}>
      {kind !== "forgot" && <input type="hidden" name="token" value={token} />}
      {kind === "forgot" && <label className="block text-sm">{c.email}<input name="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={e => { setEmail(e.target.value); setLocal("idle"); }} className={field} /></label>}
      {kind === "reset" && <>
        <div>
          <label className="block text-sm">{c.newPassword}<input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} aria-invalid={passwordError || undefined} aria-describedby={passwordError ? "reset-password-error" : undefined} value={password} onChange={e => {setPassword(e.target.value);setLocal("idle");}} className={field} /></label>
          {passwordError && <p id="reset-password-error" role="alert" className="mt-2 text-sm text-warn">{message}</p>}
        </div>
        <div>
          <label className="block text-sm">{c.confirmPassword}<input name="confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} aria-invalid={confirmError || undefined} aria-describedby={confirmError ? "reset-confirm-error" : undefined} value={confirm} onChange={e => {setConfirm(e.target.value);setLocal("idle");}} className={field} /></label>
          {confirmError && <p id="reset-confirm-error" role="alert" className="mt-2 text-sm text-warn">{message}</p>}
        </div>
        <button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="min-h-11 rounded px-1 text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">{showPassword ? c.hidePassword : c.showPassword}</button>
      </>}
      <button disabled={pending || !loaded || kind === "forgot" && !available} className="min-h-12 w-full rounded-full bg-brand px-4 font-medium text-on-brand ring-1 ring-ink disabled:opacity-50">{pending ? c.working : kind === "forgot" ? c.request : kind === "reset" ? c.reset : c.verify}</button>
    </form>}
    {message && !passwordError && !confirmError && <p role={effective === "done" || effective === "requested" ? "status" : "alert"} className="mt-5 text-sm leading-relaxed">{message}</p>}
    {effective === "signIn" && <Link href="/login" target="_blank" rel="noopener" className="mt-4 block text-sm underline">{c.openSignIn}</Link>}
    {effective === "wrongAccount" && <form action={switchAccount} className="mt-4"><button disabled={switching} className="min-h-11 text-sm underline disabled:opacity-50">{switching ? c.working : c.switchAccount}</button></form>}
    {(invalidLink || effective === "invalid") && <div className="mt-4 text-sm">{kind === "verify" ? c.resendHelp : <Link href="/forgot-password" className="underline">{c.forgot}</Link>}</div>}
    <Link href="/login" className="mt-6 inline-block text-sm underline">{c.back}</Link>{kind === "verify" && <Link href="/account" className="ml-4 text-sm underline">{c.account}</Link>}
  </div>;
}
