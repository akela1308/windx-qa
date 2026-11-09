import { currentUser } from "@/lib/auth/session";
import { getStore } from "@/lib/storage";
import { backupFailure, backupHeaders } from "@/lib/backups/http";
import { exportBackup, withBackupSlot } from "@/lib/backups/service";

export async function GET(_req: Request, ctx: RouteContext<"/sites/[id]/backup">) {
  if (!await currentUser()) return Response.json({error: "auth"}, {status: 401, headers: backupHeaders});
  const {id} = await ctx.params, store = await getStore();
  const site = await store.getSite(id).catch(() => null);
  if (!site) return Response.json({error: "missing"}, {status: 404, headers: backupHeaders});
  try {
    const bytes = await withBackupSlot(() => exportBackup(store, site));
    return new Response(new Uint8Array(bytes), {headers: {...backupHeaders, "content-type": "application/json", "content-disposition": `attachment; filename="windx-${site.id}-${new Date().toISOString().slice(0,10)}.windx.json"`}});
  } catch (e) { return backupFailure(e); }
}
