import type { SiteDoc } from "@/lib/design";
import type { RequirementsInputs, RequirementsProfile, RequirementsReport } from "@/lib/requirements/types";
import type { SearchReport } from "@/lib/search/types";
import type { WorksReport } from "@/lib/checks/types";
import type { Enquiry } from "@/lib/enquiries/types";

// Модель данных кабинета. Не зависит от того, где лежат данные:
// сейчас файлы, позже база. Меняется только реализация SiteStore.

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  estimated: boolean; // true, пока работает заглушка и токены считаются по длине текста
};

export type VersionAction = "create" | "edit" | "revert" | "code" | "form" | "manual" | "canvas";

export type SiteVersion = {
  aiUsage?: import("@/lib/ai/estimate-types").AiUsageReceipt;
  n: number; // номер версии, начиная с 1
  createdAt: string;
  action: VersionAction;
  request: string; // что попросил владелец (для revert: «вернуть версию N»)
  reply: string; // короткий ответ AI владельцу, что сделано
  doc: SiteDoc;
  usage: Usage;
  demo: boolean; // ответ взят из готовых примеров, а не сгенерирован моделью
};

export type FactStatus = "unconfirmed" | "confirmed" | "wrong";

export type PendingEdit = {
  canvas?: {sectionId:string; remove:boolean};
  id: string;
  baseVersion: number;
  version: Omit<SiteVersion, "n" | "createdAt">;
};

export type Site = {
  enquiryNotifications?: { id: string; enabled: boolean; ownerId: string; email: string; locale: string };
  enquiryRecipient?: { email: string; confirmedAt: string };
  ownerId?: string; // отсутствие означает старый сайт, доступ закрыт до переноса
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  currentVersion: number;
  versionCount: number;
  brief: string; // исходное описание бизнеса от владельца
  // Статусы придуманных AI фактов. Ключ: текст факта.
  facts: Record<string, FactStatus>;
  starred?: boolean; // в избранном у владельца (шторка «Избранное» в меню)
  // Опубликованная версия и адрес: slug.windx.app. Правки не меняют сайт в интернете,
  // пока владелец снова не нажмёт «Опубликовать».
  published?: { slug: string; version: number; at: string };
};

export interface SiteStore {
  getRequirementsProfile(id: string): Promise<RequirementsProfile | null>;
  saveRequirementsProfile(id: string, inputs: RequirementsInputs, expected: string | null): Promise<RequirementsProfile>;
  saveRequirementsReport(id: string, report: RequirementsReport): Promise<RequirementsReport>;
  listRequirementsReports(id: string, limit?: number): Promise<RequirementsReport[]>;
  saveSearchReport(id: string, report: SearchReport): Promise<SearchReport>;
  listSearchReports(id: string, limit?: number): Promise<SearchReport[]>;
  saveWorksReport(id: string, report: WorksReport): Promise<void>;
  listWorksReports(id: string, limit?: number): Promise<WorksReport[]>;
  prepareEnquiryInbox(id: string): Promise<void>;
  addEnquiry(id: string, enquiry: Enquiry): Promise<boolean>;
  listEnquiries(id: string, limit?: number, offset?: number): Promise<Enquiry[]>;
  deleteEnquiry(id: string, enquiryId: string): Promise<void>;
  listSites(): Promise<Site[]>;
  getSite(id: string): Promise<Site | null>;
  saveSite(site: Site): Promise<void>;
  getVersion(siteId: string, n: number): Promise<SiteVersion | null>;
  listVersions(siteId: string): Promise<SiteVersion[]>;
  addVersion(siteId: string, version: SiteVersion): Promise<void>;
  getPendingEdit(siteId: string): Promise<PendingEdit | null>;
  savePendingEdit(siteId: string, edit: PendingEdit): Promise<void>;
  deletePendingEdit(siteId: string): Promise<void>;
  deleteSite(id: string): Promise<void>;
}
