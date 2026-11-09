"use client";
import { logoutAction } from "@/app/login/actions";
import { clearCodeDrafts } from "@/lib/editor-drafts/code";

import { clearTextDrafts } from "@/lib/editor-drafts/text";

import { clearCanvasDrafts } from "@/lib/editor-drafts/canvas";

export function LogoutForm({ label }: { label: string }) {
  return <form action={logoutAction} onSubmit={() => { clearCodeDrafts(); clearTextDrafts(); clearCanvasDrafts(); }}><button className="py-2 text-sm text-muted hover:text-ink">{label}</button></form>;
}
