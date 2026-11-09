"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { getStore } from "@/lib/storage";
import { getDict } from "@/lib/i18n";
import { currentIdentity } from "@/lib/auth/session";
import { renderDoc } from "@/lib/design/render";
import { analyseWorks, worksFingerprint } from "@/lib/checks/analyse";
import { WorksCheckLimit } from "@/lib/checks/files";
import { BrowserScanSchema } from "@/lib/checks/types";

async function context(siteId: string) {
  const store = await getStore(), site = await store.getSite(siteId);
  if (!site || (await currentIdentity())?.guest && site.published) throw new Error("Site not available");
  const version = await store.getVersion(siteId,site.currentVersion);
  if (!version) throw new Error("Version not found");
  return {store,site,version};
}
export async function startWorksAction(siteId: string) {
  try {
    const {site,version} = await context(siteId);
    return {ok:true as const,version:version.n,fingerprint:worksFingerprint(site,version),html:renderDoc(version.doc)};
  } catch { return {ok:false as const}; }
}
export async function finishWorksAction(siteId: string, fingerprint: string, raw: unknown) {
  try {
    const scans = z.array(BrowserScanSchema).max(2).parse(raw);
    if (scans.length && (scans.length !== 2 || scans[0].width !== 1200 || scans[1].width !== 390)) return {ok:false as const};
    const {store,site,version} = await context(siteId);
    if (worksFingerprint(site,version) !== fingerprint) return {ok:false as const,stale:true};
    const {locale} = await getDict();
    const report = analyseWorks(site,version,renderDoc(version.doc),scans,locale);
    await store.saveWorksReport(siteId,report);
    refresh();
    return {ok:true as const,report};
  } catch (error) { return {ok:false as const,limited:error instanceof WorksCheckLimit}; }
}
