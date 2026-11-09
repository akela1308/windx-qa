import { submitEnquiry } from "@/lib/enquiries/submit";
import { EnquiryError } from "@/lib/enquiries/types";
import { after } from "next/server";
import { drainEnquiryNotifications } from "@/lib/enquiries/notification-worker";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  let status = 200, ok = true, message = "Your enquiry has been received. The site owner can read it in their inbox.";
  try { await submitEnquiry(request, slug); after(drainEnquiryNotifications); }
  catch (error) {
    ok = false;
    status = error instanceof EnquiryError ? error.status : 503;
    message = error instanceof EnquiryError ? error.message : "Your enquiry could not be saved. Please try again later or use another contact method on the site.";
    if (!(error instanceof EnquiryError)) console.error("Enquiry storage failed");
  }
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer", ...(status === 429 ? { "Retry-After": "600" } : {}) };
  if (request.headers.get("accept")?.includes("application/json")) return Response.json({ ok, message }, { status, headers });
  return new Response(`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ok ? "Enquiry received" : "Enquiry not sent"}</title></head><body style="font:18px/1.6 system-ui,sans-serif;max-width:38rem;margin:12vh auto;padding:24px"><h1>${ok ? "Enquiry received" : "Enquiry not sent"}</h1><p>${escape(message)}</p><p>Use your browser’s Back button to return to the site.</p></body></html>`, { status, headers: { ...headers, "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'" } });
}
