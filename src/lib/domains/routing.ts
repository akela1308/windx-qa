import type { DomainRepository, DomainConnection } from "./types";
import type { Site } from "@/lib/storage/types";
import { ownershipValue } from "./service";
export type DomainBinding = { connection: DomainConnection; site: Site };
// Зависимости передаются явно: тесты не добавляют обход DNS в production.
export async function resolveDomain(
  host: string,
  repo: DomainRepository,
  getSite: (id: string) => Promise<Site | null>,
  verifyTxt: (
    host: string,
    value: string,
  ) => Promise<"valid" | "missing" | "unavailable">,
): Promise<{ binding: DomainBinding | null; unavailable: boolean }> {
  try {
    const registry = await repo.read();
    const matches = Object.values(registry).filter(
      (c) =>
        c.host === host &&
        c.ownershipVerified &&
        (c.status === "active" || c.status === "http"),
    );
    if (matches.length !== 1) return { binding: null, unavailable: false };
    const connection = matches[0],
      site = await getSite(connection.siteId);
    if (!site?.ownerId || site.ownerId !== connection.ownerId)
      return { binding: null, unavailable: false };
    const proof = await verifyTxt(host, ownershipValue(connection));
    return {
      binding: proof === "valid" ? { connection, site } : null,
      unavailable: proof === "unavailable",
    };
  } catch {
    return { binding: null, unavailable: true };
  }
}
