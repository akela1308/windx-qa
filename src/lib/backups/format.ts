import { z } from "zod";
import { SiteDocSchema } from "../../../experiments/exp1/a/schema";

// Формат переносимой копии проекта. Никаких аккаунтов, заявок и привязок хостинга.
export { MAX_BACKUP, MAX_DOCUMENTS } from "./limits";
export class BackupError extends Error {
  constructor(public code: "format" | "size" | "missing" | "busy" | "storage") { super(code); }
}
const date = z.iso.datetime();
export const VersionSchema = z.object({
  aiUsage: z.object({requests:z.number().int().min(0).max(100),inputTokens:z.number().int().nonnegative().max(1e10),outputTokens:z.number().int().nonnegative().max(1e10),estimated:z.boolean(),unknownRequests:z.number().int().min(0).max(100),demo:z.boolean()}).optional(),
  n: z.number().int().min(1).max(500), createdAt: date,
  action: z.enum(["create", "edit", "revert", "code", "form", "manual", "canvas"]),
  request: z.string().max(100_000), reply: z.string().max(100_000), doc: SiteDocSchema,
  demo: z.boolean(), usage: z.object({inputTokens: z.number().int().nonnegative().max(1e10), outputTokens: z.number().int().nonnegative().max(1e10), costUsd: z.number().nonnegative().max(1e8), estimated: z.boolean()}),
});
export const BackupSchema = z.object({
  format: z.literal("windx-project"), schemaVersion: z.literal(1), exportedAt: date,
  sourceId: z.string().regex(/^[a-z0-9-]{1,80}$/),
  site: z.object({name: z.string().trim().min(1).max(200), brief: z.string().max(100_000), facts: z.record(z.string().max(2000), z.enum(["unconfirmed", "confirmed", "wrong"]))}),
  currentVersion: z.number().int().min(1).max(500),
  versionCount: z.number().int().min(1).max(500),
  versions: z.array(VersionSchema).min(1).max(500),
  images: z.array(z.object({name: z.string().regex(/^[a-f0-9-]{36}\.webp$/), sha256: z.string().regex(/^[a-f0-9]{64}$/), base64: z.string().max(6 * 1024 * 1024)})).max(100),
});
export type ProjectBackup = z.infer<typeof BackupSchema>;
export function backupSummary(b: ProjectBackup) {
  return {name: b.site.name, versions: b.versions.length, images: b.images.length, currentVersion: b.currentVersion,
    customCode: b.versions.some(v => v.doc.sections.some(s => s.composition === "embed.code")), exportedAt: b.exportedAt};
}
export type BackupSummary = ReturnType<typeof backupSummary>;
