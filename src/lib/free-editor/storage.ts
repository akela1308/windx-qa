import { z } from "zod";
import { CanvasDocSchema, type CanvasDoc } from "./model";

const SnapshotsSchema = z.array(z.object({ savedAt: z.string().datetime(), doc: CanvasDocSchema })).max(8);
export type Snapshot = z.infer<typeof SnapshotsSchema>[number];
export const storageKey = (example: string) => `windx_free_editor_prototype_v1_${example}`;
export function decodeSnapshots(raw: string | null): Snapshot[] {
  if (raw === null) return [];
  if (raw.length > 2000000) throw new Error("Stored drafts are too large");
  return SnapshotsSchema.parse(JSON.parse(raw));
}
export function appendSnapshot(previous: Snapshot[], doc: CanvasDoc): Snapshot[] {
  return SnapshotsSchema.parse([...previous.slice(-7), { savedAt: new Date().toISOString(), doc }]);
}
