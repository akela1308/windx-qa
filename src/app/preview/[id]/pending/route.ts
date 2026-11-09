import { getStore } from "@/lib/storage";
import { renderDoc } from "@/lib/design/render";

// Предложение доступно для просмотра, но не становится версией до Apply.
export async function GET(req: Request, ctx: RouteContext<"/preview/[id]/pending">) {
  const { id } = await ctx.params;
  const edit = await (await getStore()).getPendingEdit(id).catch(() => null);
  const valid = edit && edit.id === new URL(req.url).searchParams.get("edit");
  return new Response(valid ? renderDoc(edit.version.doc) : "Preview no longer available", {
    status: valid ? 200 : 404,
    headers: { "content-type": valid ? "text/html; charset=utf-8" : "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
