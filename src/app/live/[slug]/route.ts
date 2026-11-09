import {customRequestAllowed} from "@/lib/domains/public";
import { renderDoc } from "@/lib/design/render";
import { findPublished } from "@/lib/sites/publish";
import { enquirySecret, signFormToken } from "@/lib/enquiries/token";
import { hasEnquiryForm } from "@/lib/enquiries/forms";

// Опубликованный сайт клиента. Сюда ведёт proxy.ts с адреса <slug>.windx.app.
// Отдаём опубликованную версию, а не текущую: правки в редакторе не видны, пока их не опубликуют.
export async function GET(req: Request, ctx: RouteContext<"/live/[slug]">) {
  const { slug } = await ctx.params;
  const found = await findPublished(slug).catch(() => null);
  if (!found || !await customRequestAllowed(req,found.site.id)) {
    return new Response(NOT_FOUND, { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store, max-age=0" } });
  }
  const hasForm = hasEnquiryForm(found.version.doc);
  const secret = hasForm ? await enquirySecret() : null;
  const host = req.headers.get("x-windx-request-host")?.split(":")[0] ?? "";
  const action = (host.startsWith(`${slug}.`) || req.headers.get("x-windx-custom-site")===found.site.id) ? "/_enquiry" : `/live/${slug}/enquiry`;
  return new Response(renderDoc(found.version.doc, secret ? { action, recipientReady: !!found.site.enquiryRecipient?.confirmedAt, token: (section) => signFormToken(secret, { siteId: found.site.id, version: found.version.n, publication: found.site.published!.at, section }) } : undefined), {
    // Браузер хранит страницу не дольше 5 секунд. Общий кеш должен
    // перепроверять каждый запрос, чтобы не сохранять снятый с публикации сайт.
    headers: { "x-windx-version": String(found.version.n), "x-windx-publication": found.site.published!.at, "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=5, s-maxage=0, must-revalidate" },
  });
}

const NOT_FOUND = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>No site here yet</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;font:16px/1.5 system-ui,sans-serif;background:#f1f1ec;color:#121211;padding:24px}h1{font-size:28px;margin:0 0 8px}a{color:#128c7e}</style></head>
<body><main><h1>No site at this address yet.</h1><p>It may have been taken offline, or the address is mistyped.</p></main></body></html>`;
