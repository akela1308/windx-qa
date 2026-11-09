import { currentUser } from "@/lib/auth/session";
import { getStore } from "@/lib/storage";
import { MAX_UPLOAD, MediaError, saveImage } from "@/lib/media/files";
import { requestHostname } from "@/lib/domains/hostname";

export async function POST(req: Request, ctx: RouteContext<"/sites/[id]/images">) {
  const headers = { "cache-control": "no-store" };
  const error = (code: string, status: number) => Response.json({ error: code }, { status, headers });
  const user = await currentUser();
  if (!user) return error("auth", 401);
  let origin: URL;
  try { origin = new URL(req.headers.get("origin") ?? ""); } catch { return error("origin", 403); }
  const host = req.headers.get("x-windx-request-host") ?? req.headers.get("host") ?? "";
  if (origin.host !== host || !requestHostname(host)) return error("origin", 403);
  const { id } = await ctx.params;
  const site = await (await getStore()).getSite(id).catch(() => null);
  if (!site) return error("missing", 404);
  if (!/^(image\/jpeg|image\/png|image\/webp)$/.test(req.headers.get("content-type") ?? "")) return error("format", 415);
  if (Number(req.headers.get("content-length") ?? "0") > MAX_UPLOAD) return error("size", 413);
  try {
    const reader = req.body?.getReader();
    if (!reader) return error("format", 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_UPLOAD) { await reader.cancel(); return error("size", 413); }
      chunks.push(value);
    }
    const src = await saveImage(site.id, Buffer.concat(chunks));
    return Response.json({ src }, { headers });
  } catch (e) { return error(e instanceof MediaError ? e.code : "storage", e instanceof MediaError ? 400 : 503); }
}
