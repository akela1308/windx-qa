import config from "../../../../ops/platform-backup-config.json";
import { exportPlatformBackup } from "../../../../ops/platform-backup-http.mjs";

// Maintainer-only transport of encrypted archives, never a customer data export.
export async function GET(request: Request) {
  if (process.env.RAILWAY_PROJECT_ID !== config.project || process.env.RAILWAY_ENVIRONMENT_ID !== config.environment || process.env.RAILWAY_SERVICE_ID !== config.service || process.env.WINDX_DATA_DIR !== "/data") {
    return new Response("Backup unavailable", { status: 503, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
  }
  return exportPlatformBackup(request, { root: "/data", ...config });
}
