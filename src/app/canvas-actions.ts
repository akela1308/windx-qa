"use server";
import { redirect } from "next/navigation";
import { getDict } from "@/lib/i18n";
import { getManageStore } from "@/lib/storage";
import { prepareCanvasEdit } from "@/lib/free-editor/site-service";
import { reviewEdit } from "@/lib/sites/service";
import { freeCopy } from "@/lib/free-editor/copy";
import type { EditState } from "./actions";
export type CanvasState = EditState & { sectionId?: string };
export async function canvasAction(
  siteId: string,
  _prev: CanvasState,
  form: FormData,
): Promise<CanvasState> {
  let destination = "";
  try {
    const decision = form.get("decision");
    if (decision === "apply" || decision === "discard") {
      const pending = await (await getManageStore()).getPendingEdit(siteId);
      if (!pending?.canvas || pending.id !== String(form.get("editId") ?? ""))
        throw new Error("missing");
      const { sectionId, remove } = pending.canvas;
      await reviewEdit(siteId, pending.id, decision === "apply");
      if (decision === "discard") return { status: "idle" };
      destination = remove
        ? `/sites/${siteId}`
        : `/sites/${siteId}/canvas?section=${sectionId}&saved=1`;
    } else {
      const source = String(form.get("canvas") ?? "");
      if (source.length > 250000) throw new Error("size");
      const { locale } = await getDict();
      const proposal = await prepareCanvasEdit(
        siteId,
        {
          baseVersion: Number(form.get("baseVersion")),
          sectionId: form.get("sectionId")
            ? String(form.get("sectionId"))
            : null,
          after:
            form.get("after") === "footer"
              ? "footer"
              : Number(form.get("after")),
          remove: form.get("intent") === "remove",
          canvas: source ? JSON.parse(source) : undefined,
        },
        freeCopy(locale).history,
        locale,
      );
      return { status: "review", ...proposal };
    }
  } catch {
    return { status: "error" };
  }
  redirect(destination);
}
