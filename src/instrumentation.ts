export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { startEnquiryNotificationWorker } = await import("./lib/enquiries/notification-worker");
    startEnquiryNotificationWorker();
    try {
      const { startPlatformBackups } = await import("../ops/platform-backup.mjs");
      await startPlatformBackups();
    } catch {
      console.error("WINDX platform backup worker could not start");
    }
  }
}
