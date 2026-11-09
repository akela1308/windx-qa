import { currentUser } from "@/lib/auth/session";
import { backupSummary } from "@/lib/backups/format";
import { backupFailure, backupHeaders, readBackupBody, sameOrigin } from "@/lib/backups/http";
import { parseBackup, restoreBackup, withBackupSlot } from "@/lib/backups/service";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({error: "auth"}, {status: 401, headers: backupHeaders});
  if (!sameOrigin(req)) return Response.json({error: "origin"}, {status: 403, headers: backupHeaders});
  const mode = new URL(req.url).searchParams.get("mode");
  const requestId = req.headers.get("x-windx-restore-id") ?? "";
  if (!["review", "restore"].includes(mode ?? "") || mode === "restore" && req.headers.get("x-windx-confirm-backup") !== "1") return Response.json({error: "format"}, {status: 400, headers: backupHeaders});
  if (mode === "restore" && !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(requestId)) return Response.json({error: "format"}, {status: 400, headers: backupHeaders});
  try {
    return await withBackupSlot(async () => {
      const backup = await parseBackup(await readBackupBody(req));
      if (mode === "review") return Response.json({summary: backupSummary(backup)}, {headers: backupHeaders});
      const id = await restoreBackup(backup, user.id, requestId);
      return Response.json({id}, {headers: backupHeaders});
    });
  } catch (e) { return backupFailure(e); }
}
