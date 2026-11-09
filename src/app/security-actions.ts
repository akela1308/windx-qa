"use server";
import { headers } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { currentUser, currentIdentity, signOut } from "@/lib/auth/session";
import { allowAttempt, normalizeEmail, accountSummary } from "@/lib/auth/accounts";
import { allowSecurityMail, consumeSecurityToken, verificationStatus, SecurityLinkError } from "@/lib/auth/security-tokens";
import { scheduleSecurityMail, schedulePasswordChanged, deliverSecurityMail } from "@/lib/auth/security-mail";
import { mailMode } from "@/lib/mail/transport";
import { getDict } from "@/lib/i18n";
export type SecurityState = "idle" | "requested" | "unavailable" | "rate" | "invalidEmail" | "failed" | "passwordShort" | "passwordLong" | "mismatch" | "invalid" | "done" | "signIn" | "wrongAccount";
export async function switchVerificationAccountAction(): Promise<SecurityState> {
  await signOut();
  return "signIn";
}
export async function requestResetAction(_state: SecurityState, form: FormData): Promise<SecurityState> {
  const email = normalizeEmail(String(form.get("email") ?? ""));
  if (email.length > 254 || !z.email().safeParse(email).success) return "invalidEmail";
  if (mailMode() === "disabled") return "unavailable";
  try {
    if (!await allowSecurityMail(email, (await headers()).get("x-real-ip") ?? "unavailable")) return "rate";
    scheduleSecurityMail(email, "reset", (await getDict()).locale);
    return "requested";
  } catch { return "failed"; }
}
export async function requestVerificationAction(_state: SecurityState, _form: FormData): Promise<SecurityState> {
  void _state; void _form;
  const user = await currentUser();
  if (!user) return "failed";
  try {
    if ((await accountSummary(user)).verified) return "done";
    if (mailMode() === "disabled") return "unavailable";
    if (!await allowSecurityMail(user.email, `verify:${user.id}`)) return "rate";
    return await deliverSecurityMail(user.email, "verify", (await getDict()).locale, user) ? "requested" : "failed";
  } catch { return "failed"; }
}
export async function resetPasswordAction(_state: SecurityState, form: FormData): Promise<SecurityState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return "passwordShort";
  if (password.length > 128) return "passwordLong";
  if (password !== String(form.get("confirm") ?? "")) return "mismatch";
  if (!allowAttempt("security-completion:global", 200)) return "rate";
  try {
    const current = await currentIdentity();
    const user = await consumeSecurityToken(String(form.get("token") ?? ""), "reset", password);
    // Гостевой пробник сохраняется, чтобы при последующем входе перейти в аккаунт.
    if (current && !current.guest) {
      try { await signOut(); } catch { console.error("WINDX session-cookie cleanup could not complete after password reset"); }
    }
    schedulePasswordChanged(user.email, (await getDict()).locale);
    refresh();
    return "done";
  } catch (error) { return error instanceof SecurityLinkError ? "invalid" : "failed"; }
}
export async function verifyEmailAction(_state: SecurityState, form: FormData): Promise<SecurityState> {
  if (!allowAttempt("security-completion:global", 200)) return "rate";
  try {
    const user = await currentUser();
    if (!user) return "signIn";
    const token = String(form.get("token") ?? "");
    const status = await verificationStatus(token, user);
    if (status !== "valid") return status;
    await consumeSecurityToken(token, "verify");
    return "done";
  } catch (error) { return error instanceof SecurityLinkError ? "invalid" : "failed"; }
}
