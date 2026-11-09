"use server";

import { getDict } from "@/lib/i18n";
import { mailMode } from "@/lib/mail/transport";
import { allowSecurityMail } from "@/lib/auth/security-tokens";
import { scheduleSecurityMail } from "@/lib/auth/security-mail";
import { redirect } from "next/navigation";
import { allowAttempt, authenticate, normalizeEmail, registerAccount } from "@/lib/auth/accounts";
import { signIn, signOut } from "@/lib/auth/session";
import { returnPath } from "@/lib/auth/return-path";
import { loginCopy } from "@/lib/auth/login-copy";

export async function loginAction(_previous: string, form: FormData): Promise<string> {
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  const c = loginCopy((await getDict()).locale);
  if (!allowAttempt("global") || !allowAttempt(email)) return c.rate;
  let user;
  try {
    user = form.get("mode") === "register"
      ? await registerAccount(email, password, String(form.get("invitation") ?? ""))
      : await authenticate(email, password);
  } catch {
    return c.registerFailed;
  }
  if (!user) return c.invalid;
  try { await signIn(user); }
  catch { return c.changed; }
  if (form.get("mode") === "register" && mailMode() !== "disabled") {
    try { if (await allowSecurityMail(user.email, `register:${user.id}`)) scheduleSecurityMail(user.email, "verify", (await getDict()).locale, user); }
    catch { /* Аккаунт создан. Повторное письмо можно запросить в настройках. */ }
  }
  redirect(returnPath(form.get("next")));
}

export async function logoutAction() {
  await signOut();
  redirect("/login");
}
