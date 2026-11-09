import {
  mkdir,
  readFile,
  readdir,
  writeFile,
  rename,
  link,
  unlink,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  RequirementsInputsSchema,
  type RequirementsInputs,
  type RequirementsProfile,
  type RequirementsReport,
} from "./types";
export class RequirementsConflict extends Error {}
export class RequirementsLimit extends Error {}
const queues = new Map<string, Promise<unknown>>();
async function serial<T>(dir: string, operation: () => Promise<T>): Promise<T> {
  const pending = (queues.get(dir) ?? Promise.resolve())
    .catch(() => {})
    .then(operation);
  queues.set(dir, pending);
  try {
    return await pending;
  } finally {
    if (queues.get(dir) === pending) queues.delete(dir);
  }
}
export async function readRequirementsProfile(
  dir: string,
): Promise<RequirementsProfile | null> {
  try {
    const raw = JSON.parse(
      await readFile(path.join(dir, "profile.json"), "utf8"),
    ) as RequirementsProfile;
    if (
      !/^[a-f0-9-]{36}$/.test(raw.revision) ||
      !Number.isFinite(Date.parse(raw.at))
    )
      throw Error("Invalid profile");
    return { ...raw, inputs: RequirementsInputsSchema.parse(raw.inputs) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
export function writeRequirementsProfile(
  dir: string,
  inputs: RequirementsInputs,
  expected: string | null,
) {
  return serial(dir, async () => {
    if (
      (await readRequirementsProfile(dir))?.revision !== (expected ?? undefined)
    )
      throw new RequirementsConflict();
    const profile: RequirementsProfile = {
      revision: randomUUID(),
      at: new Date().toISOString(),
      inputs: RequirementsInputsSchema.parse(inputs),
    };
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const temp = path.join(dir, `profile.${profile.revision}.tmp`);
    await writeFile(temp, JSON.stringify(profile), { mode: 0o600, flag: "wx" });
    try {
      await rename(temp, path.join(dir, "profile.json"));
    } finally {
      await unlink(temp).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
    return profile;
  });
}
export function writeRequirementsReport(
  dir: string,
  report: RequirementsReport,
) {
  return serial(dir, async () => {
    if (
      !/^[a-f0-9-]{36}$/.test(report.id) ||
      !Number.isFinite(Date.parse(report.at))
    )
      throw Error("Invalid report");
    if (
      ((await readRequirementsProfile(dir))?.revision ?? null) !==
      report.profileRevision
    )
      throw new RequirementsConflict();
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const file = path.join(
      dir,
      `${report.at.replace(/[^0-9]/g, "")}-${report.id}.json`,
    );
    try {
      return JSON.parse(await readFile(file, "utf8")) as RequirementsReport;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const cutoff = new Date(Date.now() - 3600_000)
      .toISOString()
      .replace(/[^0-9]/g, "");
    if (
      (await readdir(dir)).filter(
        (name) =>
          /^\d{17}-[a-f0-9-]{36}\.json$/.test(name) &&
          name.slice(0, 17) >= cutoff,
      ).length >= 30
    )
      throw new RequirementsLimit();
    const temp = `${file}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(report), { mode: 0o600, flag: "wx" });
    try {
      await link(temp, file);
    } finally {
      await unlink(temp);
    }
    return report;
  });
}
export async function readRequirementsReports(dir: string, limit = 10) {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(
    names
      .filter((v) => /^\d{17}-[a-f0-9-]{36}\.json$/.test(v))
      .sort()
      .reverse()
      .slice(0, Math.min(50, Math.max(1, limit)))
      .map(
        async (name) =>
          JSON.parse(
            await readFile(path.join(dir, name), "utf8"),
          ) as RequirementsReport,
      ),
  );
}
