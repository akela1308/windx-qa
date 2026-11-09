"use server";
import { refresh } from "next/cache";
import { getDict } from "@/lib/i18n";
import { prepareContentEdit } from "@/lib/content/service";
import { contentCopy } from "@/lib/content/copy";
import { reviewEdit } from "@/lib/sites/service";
import type { EditState } from "./actions";
import { ContentEditError, contentErrorMessage } from "@/lib/content/errors";
import { getManageStore } from "@/lib/storage";
export async function contentAction(siteId: string, _prev: EditState, form: FormData): Promise<EditState> {
  const { locale } = await getDict();
  try {
    const decision = form.get("decision");
    if (decision === "apply" || decision === "discard") {
      const store = await getManageStore();
      const pending = await store.getPendingEdit(siteId);
      if (!pending || pending.id !== String(form.get("editId") ?? "")) throw new ContentEditError("reviewExpired");
      if (decision === "apply" && (await store.getSite(siteId))?.currentVersion !== pending.baseVersion) throw new ContentEditError("stale");
      await reviewEdit(siteId, String(form.get("editId") ?? ""), decision === "apply");
      refresh();
      return { status: decision === "apply" ? "ok" : "idle" };
    }
    const result = await prepareContentEdit(siteId, { resolvedFacts: form.getAll("resolvedFact").map(String), intent: form.get("intent") === "add-image" ? "add-image" : "update", ...(form.has("afterSection")?{afterSection:Number(form.get("afterSection"))}:{}), baseVersion: Number(form.get("baseVersion")), section: Number(form.get("section")), changes: JSON.parse(String(form.get("changes") ?? "[]")) }, contentCopy(locale).history);
    refresh();
    return { status: "review", ...result };
  } catch (error) {
    return error instanceof ContentEditError
      ? { status: "error", message: contentErrorMessage(error, locale), field: error.field }
      : { status: "error", message: contentCopy(locale).error };
  }
}
