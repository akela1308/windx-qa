import type { PendingEdit, Site, SiteStore, SiteVersion } from "./types";
import type { RequirementsInputs, RequirementsReport } from "@/lib/requirements/types";
import type { SearchReport } from "@/lib/search/types";
import type { WorksReport } from "@/lib/checks/types";
import type { Enquiry } from "@/lib/enquiries/types";

// Все операции кабинета проверяют владельца здесь, включая прямые вызовы действий.
// Старые сайты без ownerId закрыты для всех до явного переноса администратором.
export class OwnedSiteStore implements SiteStore {
  constructor(private raw: SiteStore, private ownerId: string | null, private guest = false) {}
  async getRequirementsProfile(id: string) { await this.require(id); return this.raw.getRequirementsProfile(id); }
  async saveRequirementsProfile(id: string, inputs: RequirementsInputs, expected: string | null) {
    await this.require(id); if (this.guest && (await this.getSite(id))?.published) throw new Error("Sign in to manage this site");
    return this.raw.saveRequirementsProfile(id, inputs, expected);
  }
  async saveRequirementsReport(id: string, report: RequirementsReport) {
    await this.require(id); if (this.guest && (await this.getSite(id))?.published) throw new Error("Sign in to manage this site");
    return this.raw.saveRequirementsReport(id, report);
  }
  async listRequirementsReports(id: string, limit?: number) { await this.require(id); return this.raw.listRequirementsReports(id, limit); }
  async saveSearchReport(id: string, report: SearchReport) {
    await this.require(id);
    if (this.guest && (await this.getSite(id))?.published) throw new Error("Sign in to manage this site");
    return this.raw.saveSearchReport(id, report);
  }
  async listSearchReports(id: string, limit?: number) { await this.require(id); return this.raw.listSearchReports(id, limit); }
  async saveWorksReport(id: string, report: WorksReport) {
    await this.require(id);
    if (this.guest && (await this.getSite(id))?.published) throw new Error("Sign in to manage this site");
    await this.raw.saveWorksReport(id, report);
  }
  async listWorksReports(id: string, limit?: number) { await this.require(id); return this.raw.listWorksReports(id, limit); }
  async prepareEnquiryInbox(id: string) { await this.require(id); await this.raw.prepareEnquiryInbox(id); }
  async addEnquiry(_id: string, _enquiry: Enquiry): Promise<boolean> { void _id; void _enquiry; throw new Error("Use the validated public submission route"); }
  async listEnquiries(id: string, limit?: number, offset?: number) { this.member(); await this.require(id); return this.raw.listEnquiries(id, limit, offset); }
  async deleteEnquiry(id: string, enquiryId: string) { this.member(); await this.require(id); await this.raw.deleteEnquiry(id, enquiryId); }
  async listSites() { return this.ownerId ? (await this.raw.listSites()).filter((s) => s.ownerId === this.ownerId) : []; }
  async getSite(id: string) {
    const site = await this.raw.getSite(id);
    return this.ownerId && site?.ownerId === this.ownerId ? site : null;
  }
  private async require(id: string) { if (!await this.getSite(id)) throw new Error("Site not found"); }
  async saveSite(site: Site) {
    if (!this.ownerId) throw new Error("Sign in required");
    const existing = await this.raw.getSite(site.id);
    if ((existing && existing.ownerId !== this.ownerId) || (site.ownerId && site.ownerId !== this.ownerId)) throw new Error("Site not found");
    if (this.guest) {
      if (!existing && (await this.listSites()).length) throw new Error("Only one trial site");
      if (existing) {
        const stable = (s: Site) => Object.fromEntries(Object.entries(s).filter(([k]) => !["facts", "updatedAt", "published", "enquiryRecipient"].includes(k)));
        if (existing.published || JSON.stringify(stable(site)) !== JSON.stringify(stable(existing))) throw new Error("Sign in to manage this site");
        if (site.published && site.published.version !== existing.currentVersion) throw new Error("Invalid publication version");
      }
    }
    await this.raw.saveSite({ ...site, ownerId: this.ownerId });
  }
  async getVersion(id: string, n: number) { return await this.getSite(id) ? this.raw.getVersion(id, n) : null; }
  async listVersions(id: string) { return await this.getSite(id) ? this.raw.listVersions(id) : []; }
  async addVersion(id: string, version: SiteVersion) { await this.require(id); if (this.guest && (version.n !== 1 || await this.raw.getVersion(id, 1))) throw new Error("Sign in to edit"); await this.raw.addVersion(id, version); }
  async getPendingEdit(id: string) { return !this.guest && await this.getSite(id) ? this.raw.getPendingEdit(id) : null; }
  private member() { if (!this.ownerId || this.guest) throw new Error("Sign in to manage this site"); }
  async savePendingEdit(id: string, edit: PendingEdit) { this.member(); await this.require(id); await this.raw.savePendingEdit(id, edit); }
  async deletePendingEdit(id: string) { this.member(); await this.require(id); await this.raw.deletePendingEdit(id); }
  async deleteSite(id: string) { this.member(); await this.require(id); await this.raw.deleteSite(id); }
}
