"use server";
import { refresh } from "next/cache";
import { getStore } from "@/lib/storage";
import { currentIdentity } from "@/lib/auth/session";
import {
  RequirementsInputsSchema,
  type RequirementsTarget,
} from "@/lib/requirements/types";
import {
  analyseRequirements,
  requirementsFingerprint,
} from "@/lib/requirements/analyse";
import {
  RequirementsConflict,
  RequirementsLimit,
} from "@/lib/requirements/files";
import { requirementsState } from "@/lib/requirements/state";
async function context(id: string) {
  const store = await getStore(),
    site = await store.getSite(id);
  if (!site || ((await currentIdentity())?.guest && site.published))
    throw Error("Unavailable");
  return { store, site };
}
const saves = new Map<string, { n: number; until: number }>();
export async function saveRequirementsInputsAction(
  id: string,
  raw: unknown,
  expected: string | null,
) {
  try {
    const { store, site } = await context(id);
    const inputs = RequirementsInputsSchema.parse(raw);
    const previous = await store.getRequirementsProfile(id);
    if (previous?.inputs.country && previous.inputs.country !== inputs.country) inputs.market = "unknown";
    if (expected !== null && !/^[a-f0-9-]{36}$/.test(expected))
      throw Error("Invalid revision");
    const now = Date.now();
    for (const [key, value] of saves) if (value.until <= now) saves.delete(key);
    const bucket = saves.get(id) ?? { n: 0, until: now + 60_000 };
    saves.set(id, bucket);
    if (++bucket.n > 60) return { ok: false as const, limited: true };
    await store.saveRequirementsProfile(id, inputs, expected);
    const state = await requirementsState(store, site);
    refresh();
    return { ok: true as const, state };
  } catch (error) {
    if (error instanceof RequirementsConflict) {
      const { store, site } = await context(id);
      const state = await requirementsState(store, site);
      refresh();
      return { ok: false as const, stale: true, state };
    }
    return { ok: false as const, stale: false };
  }
}
export async function runRequirementsAction(
  id: string,
  target: RequirementsTarget,
  expected: string,
) {
  try {
    const { store, site } = await context(id);
    if (
      (target !== "draft" && target !== "published") ||
      (target === "published" && !site.published)
    )
      throw Error("Invalid target");
    const [version, profile] = await Promise.all([
      store.getVersion(
        id,
        target === "draft" ? site.currentVersion : site.published!.version,
      ),
      store.getRequirementsProfile(id),
    ]);
    if (!version) throw Error("Missing version");
    if (requirementsFingerprint(site, version, target, profile) !== expected) {
      const state = await requirementsState(store, site);
      refresh();
      return { ok: false as const, stale: true, state };
    }
    const report = analyseRequirements(site, version, target, profile);
    // Проверяем сайт повторно перед сохранением. Позднейшие изменения всё равно
    // делают отпечаток отчёта устаревшим в интерфейсе.
    const fresh = await store.getSite(id);
    if (!fresh) throw Error("Unavailable");
    const latest = await store.getVersion(
      id,
      target === "draft"
        ? fresh.currentVersion
        : (fresh.published?.version ?? 0),
    );
    if (
      !latest ||
      requirementsFingerprint(
        fresh,
        latest,
        target,
        await store.getRequirementsProfile(id),
      ) !== expected
    ) {
      const state = await requirementsState(store, fresh);
      refresh();
      return { ok: false as const, stale: true, state };
    }
    await store.saveRequirementsReport(id, report);
    const state = await requirementsState(store, fresh);
    refresh();
    return { ok: true as const, state, report };
  } catch (error) {
    if (error instanceof RequirementsConflict) {
      const { store, site } = await context(id);
      const state = await requirementsState(store, site);
      refresh();
      return { ok: false as const, stale: true, state };
    }
    return {
      ok: false as const,
      stale: false,
      limited: error instanceof RequirementsLimit,
    };
  }
}
