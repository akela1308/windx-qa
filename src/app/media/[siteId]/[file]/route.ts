import { getPublicStore, getStore } from "@/lib/storage";
import { readImage } from "@/lib/media/files";
import { mediaRefs, MEDIA_PATH } from "@/lib/media/refs";
import { cabinetHost, requestHostname } from "@/lib/domains/hostname";
import { customRequestAllowed } from "@/lib/domains/public";

export async function GET(req: Request, ctx: RouteContext<"/media/[siteId]/[file]">) {
  const { siteId, file } = await ctx.params;
  const src = `/media/${siteId}/${file}`;
  const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
  if (!MEDIA_PATH.test(src)) return new Response(null, { status: 404, headers });
  try {
    const site = await getPublicStore().getSite(siteId);
    if (!site) throw new Error("missing");
    const host = requestHostname(req.headers.get("x-windx-request-host") ?? req.headers.get("host") ?? "");
    const cabinet = !!host && cabinetHost(host);
    const root = process.env.WINDX_SITES_DOMAIN ?? "windx.app";
    if (!cabinet && host !== `${site.published?.slug}.${root}` && host !== `${site.published?.slug}.localhost` && req.headers.get("x-windx-custom-site") !== siteId) throw new Error("host");
    if (!await customRequestAllowed(req, siteId)) throw new Error("domain");
    const published = site.published && await getPublicStore().getVersion(siteId, site.published.version);
    const visible = published && mediaRefs(published.doc).includes(src);
    if (!visible && !(cabinet && await (await getStore()).getSite(siteId))) throw new Error("private");
    const bytes = await readImage(src);
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "content-type": "image/webp" } });
  } catch { return new Response(null, { status: 404, headers }); }
}
