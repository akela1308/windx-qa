"use server";
import { refresh } from "next/cache";
import { getDict } from "@/lib/i18n";
import { getManageStore } from "@/lib/storage";
import { confirmEnquiryRecipient, prepareEnquiryForm } from "@/lib/enquiries/manage";
import { reviewEdit } from "@/lib/sites/service";
import type { EditState } from "./actions";
import { configureEnquiryNotifications } from "@/lib/enquiries/notification-settings";

export async function enquiryNotificationsAction(siteId: string, _previous: string, form: FormData) {
  try {
    if (form.get("enabled") !== "1" && form.get("enabled") !== "0") throw new Error("Invalid notification setting");
    await configureEnquiryNotifications(siteId, form.get("enabled") === "1", (await getDict()).locale); refresh(); return "saved";
  }
  catch { return "error"; }
}

export async function enquiryRecipientAction(siteId: string, _previous: string, form: FormData) {
  try { await confirmEnquiryRecipient(siteId, String(form.get("email") ?? "")); refresh(); return "saved"; }
  catch { return "error"; }
}
export async function enquiryFormAction(siteId: string, _previous: EditState, form: FormData): Promise<EditState> {
  try {
    const decision = form.get("decision");
    if (decision === "apply" || decision === "discard") {
      await reviewEdit(siteId, String(form.get("editId") ?? ""), decision === "apply"); refresh(); return { status: decision === "apply" ? "ok" : "idle" };
    }
    const { t } = await getDict();
    const proposal = await prepareEnquiryForm(siteId, Number(form.get("baseVersion")), form.get("kind") === "inline", t.enquiries.added);
    refresh(); return { status: "review", ...proposal };
  } catch { return { status: "error" }; }
}
export async function deleteEnquiryAction(siteId: string, enquiryId: string) {
  await (await getManageStore()).deleteEnquiry(siteId, enquiryId); refresh();
}
