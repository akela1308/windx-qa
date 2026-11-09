import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PendingEdit, Site, SiteStore, SiteVersion } from "./types";
import { saveWorksReport, listWorksReports } from "@/lib/checks/files";
import { saveSearchReport, listSearchReports } from "@/lib/search/files";
import { readRequirementsProfile, writeRequirementsProfile, readRequirementsReports, writeRequirementsReport } from "@/lib/requirements/files";
import type { RequirementsInputs, RequirementsReport } from "@/lib/requirements/types";
import type { SearchReport } from "@/lib/search/types";
import type { WorksReport } from "@/lib/checks/types";
import type { Enquiry } from "@/lib/enquiries/types";
import { addFileEnquiry, listFileEnquiries, deleteFileEnquiry } from "@/lib/enquiries/file-inbox";

// Хранилище в файлах проекта: data/sites/<id>/site.json и versions/<n>.json.
// Папка data не попадает в git. Это временная замена базы данных.

export class FileSiteStore implements SiteStore {
  constructor(private root: string) {}

  async getRequirementsProfile(id: string) { return readRequirementsProfile(path.join(this.siteDir(id), "checks", "requirements")); }
  async saveRequirementsProfile(id: string, inputs: RequirementsInputs, expected: string | null) {
    if (!await this.getSite(id)) throw new Error("Site not found");
    return writeRequirementsProfile(path.join(this.siteDir(id), "checks", "requirements"), inputs, expected);
  }
  async saveRequirementsReport(id: string, report: RequirementsReport) {
    if (!await this.getSite(id)) throw new Error("Site not found");
    return writeRequirementsReport(path.join(this.siteDir(id), "checks", "requirements"), report);
  }
  async listRequirementsReports(id: string, limit?: number) { return readRequirementsReports(path.join(this.siteDir(id), "checks", "requirements"), limit); }
  async saveSearchReport(id: string, report: SearchReport) {
    if (!await this.getSite(id)) throw new Error("Site not found");
    return saveSearchReport(path.join(this.siteDir(id), "checks", "search"), report);
  }
  async listSearchReports(id: string, limit?: number) { return listSearchReports(path.join(this.siteDir(id), "checks", "search"), limit); }
  async saveWorksReport(id: string, report: WorksReport) {
    if (!await this.getSite(id)) throw new Error("Site not found");
    await saveWorksReport(path.join(this.siteDir(id), "checks", "works"), report);
  }
  async listWorksReports(id: string, limit?: number) { return listWorksReports(path.join(this.siteDir(id), "checks", "works"), limit); }

  async prepareEnquiryInbox(id: string) {
    if (!await this.getSite(id)) throw new Error("Site not found");
    await mkdir(path.join(this.siteDir(id), "enquiries"), { recursive: true, mode: 0o700 });
  }
  async addEnquiry(id: string, enquiry: Enquiry) {
    if (!await this.getSite(id)) throw new Error("Site not found");
    return addFileEnquiry(path.join(this.siteDir(id), "enquiries"), enquiry);
  }
  async listEnquiries(id: string, limit?: number, offset?: number) { return listFileEnquiries(path.join(this.siteDir(id), "enquiries"), limit, offset); }
  async deleteEnquiry(id: string, enquiryId: string) { await deleteFileEnquiry(path.join(this.siteDir(id), "enquiries"), enquiryId); }

  private siteDir(id: string) {
    // id генерируем сами, но на всякий случай не даём выйти из папки.
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Bad site id: ${id}`);
    return path.join(this.root, "sites", id);
  }

  async listSites(): Promise<Site[]> {
    const dir = path.join(this.root, "sites");
    let ids: string[] = [];
    try {
      ids = await readdir(dir);
    } catch {
      return [];
    }
    const sites = await Promise.all(ids.map((id) => this.getSite(id)));
    return sites.filter((s): s is Site => s !== null).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getSite(id: string): Promise<Site | null> {
    return readJson<Site>(path.join(this.siteDir(id), "site.json"));
  }

  async saveSite(site: Site): Promise<void> {
    await writeJson(path.join(this.siteDir(site.id), "site.json"), site);
  }

  async getVersion(siteId: string, n: number): Promise<SiteVersion | null> {
    return readJson<SiteVersion>(path.join(this.siteDir(siteId), "versions", `${n}.json`));
  }

  async listVersions(siteId: string): Promise<SiteVersion[]> {
    const site = await this.getSite(siteId);
    if (!site) return [];
    const all = await Promise.all(Array.from({ length: site.versionCount }, (_, i) => this.getVersion(siteId, i + 1)));
    return all.filter((v): v is SiteVersion => v !== null);
  }

  async addVersion(siteId: string, version: SiteVersion): Promise<void> {
    await writeJson(path.join(this.siteDir(siteId), "versions", `${version.n}.json`), version);
  }

  async getPendingEdit(siteId: string): Promise<PendingEdit | null> {
    return readJson<PendingEdit>(path.join(this.siteDir(siteId), "pending-edit.json"));
  }

  async savePendingEdit(siteId: string, edit: PendingEdit): Promise<void> {
    // Расход запроса сохраняется и при отклонении предложения клиентом.
    if (edit.version.action === "edit") await writeJson(path.join(this.siteDir(siteId), "ai-requests", `${edit.id}.json`), { id: edit.id, at: new Date().toISOString(), usage: edit.version.usage });
    await writeJson(path.join(this.siteDir(siteId), "pending-edit.json"), edit);
  }

  async deletePendingEdit(siteId: string): Promise<void> {
    await rm(path.join(this.siteDir(siteId), "pending-edit.json"), { force: true });
  }

  // Удаляет сайт со всеми версиями. Вызывается только после подтверждения владельцем.
  async deleteSite(id: string): Promise<void> {
    await rm(this.siteDir(id), { recursive: true, force: true });
  }
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

// Пишем во временный файл и переименовываем: при сбое не останется полузаписанного JSON.
async function writeJson(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 1));
  await rename(tmp, file);
}
