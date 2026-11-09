"use server";

import { refresh } from "next/cache";
import { getDict } from "@/lib/i18n";
import { prepareCodeEdit } from "@/lib/sites/code";
import { reviewEdit } from "@/lib/sites/service";
import type { EditState } from "./actions";

// prepareCodeEdit / reviewEdit проверяют аккаунт и владельца через getManageStore.
export async function codeAction(siteId: string, _prev: EditState, form: FormData): Promise<EditState> {
  try {
    const decision = form.get("decision");
    if (decision === "apply" || decision === "discard") {
      await reviewEdit(siteId, String(form.get("editId") ?? ""), decision === "apply");
      refresh();
      return { status: decision === "apply" ? "ok" : "idle" };
    }
    const { t } = await getDict();
    const index = form.get("index") === "new" ? null : Number(form.get("index"));
    const remove = form.get("intent") === "remove";
    const title = String(form.get("title") ?? "");
    const proposal = await prepareCodeEdit(siteId, {
      baseVersion: Number(form.get("baseVersion")), index, remove,
      after: form.get("after") === "footer" ? "footer" : Number(form.get("after")),
      code: { title, html: String(form.get("html") ?? ""), css: String(form.get("css") ?? ""), js: String(form.get("js") ?? ""), height: Number(form.get("height")), mobileHeight: Number(form.get("mobileHeight")) },
    }, `${remove ? t.editor.code.remove : index === null ? t.editor.code.add : t.editor.code.update}: ${title}`);
    refresh();
    return { status: "review", ...proposal };
  } catch {
    return { status: "error" };
  }
}
