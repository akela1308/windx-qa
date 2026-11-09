"use client";
import { useActionState } from "react";
import { requestVerificationAction, type SecurityState } from "@/app/security-actions";
import { securityCopy } from "@/lib/auth/security-copy";
export function EmailStatus({ verified, available, test, locale }: { verified: boolean; available: boolean; test: boolean; locale: string }) {
  const c = securityCopy(locale);
  const [state, action, pending] = useActionState(requestVerificationAction, "idle" as SecurityState);
  return <div className="mt-8 border-t border-line pt-6">
    <h2 className="text-lg font-medium">{verified || state === "done" ? c.verified : c.unverified}</h2>
    {!verified && state !== "done" && <>
      <p className="mt-3 text-sm text-muted">{c.verifyHelp}</p>
      {!available && <p role="status" className="mt-3 text-sm">{c.unavailable}</p>}
      {test && <p className="mt-3 text-sm">{c.local}</p>}
      <form action={action} className="mt-4"><button disabled={pending || !available} className="rounded-full border border-ink px-4 py-2 text-sm disabled:opacity-50">{pending ? c.working : c.resend}</button></form>
      {state !== "idle" && <p role={state === "requested" ? "status" : "alert"} className="mt-3 text-sm">{state === "requested" ? c.verifyRequested : state === "mismatch" || state === "invalid" ? c.failed : c[state]}</p>}
    </>}
  </div>;
}
