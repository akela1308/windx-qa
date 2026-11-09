import { mkdir, readdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { WorksReport } from "./types";

export class WorksCheckLimit extends Error {}

const queues = new Map<string, Promise<void>>();

// Один процесс не даст параллельным запросам обойти файловый лимит.
export async function saveWorksReport(dir: string, report: WorksReport) {
  const pending = (queues.get(dir) ?? Promise.resolve()).then(() => writeReport(dir, report));
  const settled = pending.then(() => {}, () => {});
  queues.set(dir, settled);
  try { await pending; } finally { if (queues.get(dir) === settled) queues.delete(dir); }
}
async function writeReport(dir: string, report: WorksReport) {
  if (!/^[a-f0-9-]{36}$/.test(report.id)) throw new Error("Invalid report id");
  await mkdir(dir,{recursive:true,mode:0o700});
  const cutoff = new Date(Date.now()-60*60_000).toISOString().replace(/[^0-9]/g, "");
  const recent = (await readdir(dir)).filter(name => /^\d{17}-[a-f0-9-]{36}\.json$/.test(name) && name.slice(0,17) >= cutoff);
  if (recent.length >= 30) throw new WorksCheckLimit("Too many checks");
  const file = path.join(dir,`${report.at.replace(/[^0-9]/g,"")}-${report.id}.json`);
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp,JSON.stringify(report),{flag:"wx",mode:0o600});
  await rename(temp,file);
}
export async function listWorksReports(dir: string, limit = 10): Promise<WorksReport[]> {
  let files: string[];
  try { files = await readdir(dir); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; }
  return Promise.all(files.filter(f=>/^\d{17}-[a-f0-9-]{36}\.json$/.test(f)).sort().reverse().slice(0,Math.min(50,Math.max(1,limit))).map(async f=>JSON.parse(await readFile(path.join(dir,f),"utf8")) as WorksReport));
}
