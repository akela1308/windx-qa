import {customRequestAllowed} from "@/lib/domains/public";
import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import { findPublished } from "@/lib/sites/publish";
import { getPublicStore } from "@/lib/storage";
import { enquirySecret, verifyFormToken } from "./token";
import { isEnquiryForm } from "./forms";
import { EnquiryError, type Enquiry } from "./types";
import { withNotificationJob, type StoredEnquiry } from "./notification-job";

const buckets = new Map<string, { n: number; until: number }>();
function allow(key: string, max: number, window: number) {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.until <= now) buckets.delete(k);
  if (!buckets.has(key) && buckets.size >= 2000) return false;
  const value = buckets.get(key) ?? { n: 0, until: now + window };
  buckets.set(key, value);
  return ++value.n <= max;
}
async function bodyParams(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) throw new EnquiryError(415, "Please use the enquiry form on the site.");
  if (Number(request.headers.get("content-length")) > 65_536) throw new EnquiryError(413, "The message is too long.");
  const reader = request.body?.getReader();
  if (!reader) throw new EnquiryError(400, "Please complete the form.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 65_536) { await reader.cancel(); throw new EnquiryError(413, "The message is too long."); }
    chunks.push(value);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}
function field(params: URLSearchParams, key: string, max: number, required = true) {
  const values = params.getAll(key);
  const value = (values[0] ?? "").trim();
  if (values.length > 1 || value.length > max || required && !value || key !== "message" && /[\r\n]/.test(value) || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) throw new EnquiryError(400, `Please check the ${key} field.`);
  return value;
}

export async function submitEnquiry(request: Request, slug: string) {
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  let sameOrigin = false;
  try { const url = new URL(origin ?? ""); sameOrigin = url.host === request.headers.get("x-windx-request-host") && ["https:", "http:"].includes(url.protocol) && (process.env.NODE_ENV !== "production" || url.protocol === "https:"); } catch {}
  if (!sameOrigin) throw new EnquiryError(403, "Please open the form on the site and try again.");
  const params = await bodyParams(request);
  if (field(params, "extra_reference", 200, false)) throw new EnquiryError(400, "Your enquiry could not be sent. Please reload the page and try again.");
  const token = field(params, "token", 2000);
  const secret = await enquirySecret(), context = verifyFormToken(secret, token);
  const found = await findPublished(slug);
  if (!found?.site.published || !await customRequestAllowed(request,found.site.id)) throw new EnquiryError(404, "This form is no longer available.");
  const { site, version } = found;
  const section = version.doc.sections[context.section];
  if (context.siteId !== site.id || context.version !== version.n || context.publication !== site.published!.at || !section || !isEnquiryForm(section.composition)) throw new EnquiryError(409, "This form has changed. Reload the page and try again.");
  if (!site.enquiryRecipient?.confirmedAt || !site.enquiryRecipient.email) throw new EnquiryError(409, "This form is not accepting enquiries yet.");
  const name = field(params, "name", 100, section.composition === "contact.form");
  const contact = field(params, "contact", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) && !(/^\+?[\d\s().-]{6,30}$/.test(contact) && (contact.match(/\d/g)?.length ?? 0) >= 7)) throw new EnquiryError(400, "Please enter an email address or phone number.");
  const message = field(params, "message", 4000);
  const submission = field(params, "submission", 80);
  if (!/^[a-zA-Z0-9-]+$/.test(submission)) throw new EnquiryError(400, "Please reload the page and try again.");
  const id = createHash("sha256").update(JSON.stringify([token, submission, name, contact, message])).digest("hex");
  const ip = request.headers.get("x-real-ip") ?? "";
  const ipKey = createHmac("sha256", secret).update(isIP(ip) ? ip : "unknown").digest("hex");
  if (!allow(`${site.id}:all`, 60, 60 * 60_000) || !allow(`${site.id}:${ipKey}`, 5, 10 * 60_000)) throw new EnquiryError(429, "Too many attempts. Please wait a few minutes and try again.");
  const enquiry: Enquiry = { id, createdAt: new Date().toISOString(), name, contact, message, version: version.n, section: context.section };
  let stored: StoredEnquiry;
  try { stored = await withNotificationJob(site, enquiry); }
  catch { console.error("WINDX enquiry notification preparation failed"); stored = { ...enquiry, notification: { status: "failed", attempts: 0 } }; }
  await getPublicStore().addEnquiry(site.id, stored);
  return { ok: true as const };
}
