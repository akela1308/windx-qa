"use server";
import { refresh } from "next/cache";
import { currentUser } from "@/lib/auth/session";
import { getManageStore } from "@/lib/storage";
import { domainService } from "@/lib/domains/runtime";
import {
  DomainError,
  type DomainIssue,
  type DomainClientState,
} from "@/lib/domains/types";
const starts = new Map<string, { n: number; until: number }>();
export async function domainAction(
  siteId: string,
  action: "create" | "check" | "disconnect",
  expected: string | null,
  input = "",
): Promise<
  { ok: true; state: DomainClientState } | { ok: false; issue: DomainIssue }
> {
  try {
    const user = await currentUser();
    if (!user) throw new DomainError("account");
    const store = await getManageStore();
    const site = async () => {
      const value = await store.getSite(siteId);
      if (!value || value.ownerId !== user.id)
        throw new DomainError("notFound");
      return value;
    };
    await site();
    const now = Date.now();
    for (const [key, value] of starts)
      if (value.until <= now) starts.delete(key);
    const b = starts.get(user.id) ?? { n: 0, until: now + 60_000 };
    if (!starts.has(user.id) && starts.size >= 2000)
      throw new DomainError("busy");
    starts.set(user.id, b);
    if (++b.n > 6) throw new DomainError("busy");
    const service = domainService(site);
    let state: DomainClientState;
    if (action === "create") state = await service.create(input, expected);
    else if (action === "disconnect" && expected)
      state = await service.disconnect(expected);
    else if (action === "check" && expected) {
      state = await service.check(expected);
      if (state.connection?.status === "http")
        state = await service.finishCheck(expected);
    } else throw new DomainError("invalid");
    refresh();
    return { ok: true, state };
  } catch (error) {
    return {
      ok: false,
      issue: error instanceof DomainError ? error.code : "platform",
    };
  }
}
