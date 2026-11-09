import { after } from "next/server";
import { randomUUID } from "node:crypto";
import { mailMode, sendSecurityMail } from "@/lib/mail/transport";
import { issueSecurityToken, cancelSecurityToken, type SecurityPurpose } from "./security-tokens";
import { authOrigin } from "./google";
import { securityCopy } from "./security-copy";
import type { Identity } from "./accounts";
const escape = (v: string) => v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
export function securityMessage(purpose: SecurityPurpose, locale: string, token: string, email: string) {
  const c = securityCopy(locale), url = `${authOrigin()}/${purpose === "reset" ? "reset-password" : "verify-email"}#token=${token}`;
  const subject = purpose === "reset" ? c.mailResetSubject : c.mailVerifySubject;
  const intro = purpose === "reset" ? c.resetMail : c.verifyMail;
  return { to: email, subject, text: `${intro}\n\n${url}`, html: `<p>${escape(intro)}</p><p><a href="${escape(url)}">${escape(subject)}</a></p>`, id: randomUUID() };
}
export async function deliverSecurityMail(email: string, purpose: SecurityPurpose, locale: string, expected?: Identity) {
  const token = await issueSecurityToken(email, purpose, expected);
  if (!token) return false;
  try { await sendSecurityMail(securityMessage(purpose, locale, token, email)); return true; }
  catch { await cancelSecurityToken(token).catch(() => {}); throw new Error("Security mail unavailable"); }
}
// После ответа одинакового вида: ни существование аккаунта, ни скорость API почты
// не превращаются в результат публичной формы восстановления.
export function scheduleSecurityMail(email: string, purpose: SecurityPurpose, locale: string, expected?: Identity) {
  after(async () => {
    try { await deliverSecurityMail(email, purpose, locale, expected); }
    catch { console.error("WINDX security email could not be submitted"); }
  });
}
export function schedulePasswordChanged(email: string, locale: string) {
  if (mailMode() === "disabled") return;
  after(async () => {
    const c = securityCopy(locale);
    try { await sendSecurityMail({ to: email, subject: c.changedSubject, text: c.changedMail, html: `<p>${escape(c.changedMail)}</p>`, id: randomUUID() }); }
    catch { console.error("WINDX password-change notification could not be submitted"); }
  });
}
