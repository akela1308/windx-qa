import path from "node:path";
import { FileSiteStore } from "./file-store";
import type { SiteStore } from "./types";
import { currentIdentity, requireUser } from "@/lib/auth/session";
import { OwnedSiteStore } from "./owned-store";

export type * from "./types";

// Единственная точка доступа к хранилищу. Переезд на базу данных
// (этап 7) означает новую реализацию SiteStore и замену одной строки здесь.
let store: SiteStore | null = null;

export function getPublicStore(): SiteStore {
  store ??= new FileSiteStore(process.env.WINDX_DATA_DIR ?? path.join(process.cwd(), "data"));
  return store;
}

export async function getStore(): Promise<SiteStore> {
  const identity = await currentIdentity();
  return new OwnedSiteStore(getPublicStore(), identity?.id ?? null, !!identity?.guest);
}

export async function getManageStore(): Promise<SiteStore> {
  const user = await requireUser();
  return new OwnedSiteStore(getPublicStore(), user.id);
}
