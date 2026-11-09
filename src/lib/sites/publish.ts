import { getPublicStore, getManageStore, getStore, type Site } from "@/lib/storage";
import { hasEnquiryForm } from "@/lib/enquiries/forms";

// Публикация сайта на нашем домене: https://<slug>.<WINDX_SITES_DOMAIN>.
// Домен задаётся переменной окружения; по умолчанию windx.app.
// Локально сайт открывается как http://<slug>.localhost:3000.

export const SITES_DOMAIN = process.env.WINDX_SITES_DOMAIN ?? "windx.app";
// Поддомены, которые не могут достаться сайтам клиентов.
const RESERVED = new Set(["www", "app", "api", "admin", "mail", "help", "docs", "status", "blog", "windx"]);

export function slugify(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40).replace(/-$/, "") || "my-site";
}

export function liveUrl(slug: string): string {
  return process.env.NODE_ENV === "production" ? `https://${slug}.${SITES_DOMAIN}` : `http://${slug}.localhost:${process.env.PORT ?? "3000"}`;
}

// Адрес, который сайт получит (или уже получил): свободный slug по названию.
export async function slugFor(site: Site): Promise<string> {
  if (site.published) return site.published.slug;
  const taken = new Set((await getPublicStore().listSites()).filter((s) => s.id !== site.id && s.published).map((s) => s.published!.slug));
  const base = slugify(site.name);
  let slug = RESERVED.has(base) ? `${base}-site` : base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

export type PublishBlock = { unconfirmed: number; wrong: number; recipientMissing?: true };

// Почему нельзя публиковать: придуманные AI факты не подтверждены или помечены неверными.
export async function publishBlock(site: Site): Promise<PublishBlock | null> {
  const v = await (await getStore()).getVersion(site.id, site.currentVersion);
  const facts = (v?.doc.factsToConfirm ?? []).map((f) => site.facts[f.fact] ?? "unconfirmed");
  const unconfirmed = facts.filter((s) => s === "unconfirmed").length;
  const wrong = facts.filter((s) => s === "wrong").length;
  const recipientMissing = !!v && hasEnquiryForm(v.doc) && !site.enquiryRecipient?.confirmedAt;
  return unconfirmed || wrong || recipientMissing ? { unconfirmed, wrong, ...(recipientMissing ? { recipientMissing: true as const } : {}) } : null;
}

export async function publishSite(siteId: string): Promise<{ ok: true; url: string } | { ok: false; block: PublishBlock }> {
  const site = await (await getStore()).getSite(siteId);
  if (!site) throw new Error(`Site ${siteId} not found`);
  const block = await publishBlock(site);
  if (block) return { ok: false, block };
  const slug = await slugFor(site);
  const version = await (await getStore()).getVersion(site.id, site.currentVersion);
  if (version && hasEnquiryForm(version.doc)) await (await getStore()).prepareEnquiryInbox(site.id);
  await (await getStore()).saveSite({ ...site, published: { slug, version: site.currentVersion, at: new Date().toISOString() } });
  return { ok: true, url: liveUrl(slug) };
}

export async function unpublishSite(siteId: string): Promise<void> {
  const site = await (await getManageStore()).getSite(siteId);
  if (!site) return;
  await (await getManageStore()).saveSite({ ...site, published: undefined });
}

// Опубликованный сайт по адресу. Перебор файлов годится, пока сайтов немного;
// с базой данных это станет запросом по индексу.
export async function findPublished(slug: string) {
  const site = (await getPublicStore().listSites()).find((s) => s.published?.slug === slug);
  if (!site?.published) return null;
  const version = await getPublicStore().getVersion(site.id, site.published.version);
  return version ? { site, version } : null;
}
