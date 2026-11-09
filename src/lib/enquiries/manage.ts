import { randomUUID } from "node:crypto";
import { getManageStore, getStore } from "@/lib/storage";
import { validateEditDoc, describeFormChanges } from "@/lib/sites/edit-review";

export async function confirmEnquiryRecipient(siteId: string, email: string) {
  email = email.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email");
  const store = await getStore(), site = await store.getSite(siteId);
  if (!site) throw new Error("Site not found");
  await store.saveSite({ ...site, enquiryRecipient: { email, confirmedAt: new Date().toISOString() } });
}

export async function prepareEnquiryForm(siteId: string, baseVersion: number, compact: boolean, reply: string) {
  const store = await getManageStore(), site = await store.getSite(siteId);
  if (!site || site.currentVersion !== baseVersion) throw new Error("The site changed");
  if (await store.getPendingEdit(siteId)) throw new Error("Review the current proposal first");
  const version = await store.getVersion(siteId, baseVersion);
  if (!version) throw new Error("Version not found");
  const next = structuredClone(version.doc);
  const beforeFooter = next.sections.findIndex((section) => section.composition.startsWith("footer."));
  next.sections.splice(beforeFooter < 0 ? next.sections.length : beforeFooter, 0, {
    composition: compact ? "contact.form-inline" : "contact.form", id: `enquiry-${randomUUID().slice(0, 8)}`, tone: "default",
    props: { title: compact ? "Send a quick enquiry" : "Send an enquiry", submitLabel: "Send enquiry" },
  });
  const valid = validateEditDoc(next, version.doc);
  if (!valid.ok) throw new Error(valid.errors.join("\n"));
  const id = randomUUID();
  await store.savePendingEdit(siteId, { id, baseVersion, version: { action: "form", request: reply, reply, doc: valid.doc, demo: false, usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, estimated: false } } });
  return { id, baseVersion, reply, changes: describeFormChanges(version.doc, valid.doc) };
}
