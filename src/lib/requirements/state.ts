import { suggestCountry } from "./geography";
import { createHash } from "node:crypto";
import type { Site, SiteStore } from "@/lib/storage/types";
import { hasEnquiryForm } from "@/lib/enquiries/forms";
import { requirementsFingerprint } from "./analyse";
import type { RequirementsCheckState } from "./types";
export async function requirementsState(
  store: SiteStore,
  site: Site,
): Promise<RequirementsCheckState> {
  const [profile, reports, draft, published] = await Promise.all([
    store.getRequirementsProfile(site.id),
    store.listRequirementsReports(site.id, 10),
    store.getVersion(site.id, site.currentVersion),
    site.published ? store.getVersion(site.id, site.published.version) : null,
  ]);
  const df = draft
      ? requirementsFingerprint(site, draft, "draft", profile)
      : "",
    pf = published
      ? requirementsFingerprint(site, published, "published", profile)
      : null;
  return {
    locationHint: suggestCountry(site.brief),
    key: createHash("sha256")
      .update(JSON.stringify([df, pf, reports.map((r) => r.id)]))
      .digest("hex"),
    draft: df,
    published: pf,
    profile,
    reports,
    form: !![draft, published].some((v) => v && hasEnquiryForm(v.doc)),
    code: !![draft, published].some((v) =>
      v?.doc.sections.some((s) => s.composition === "embed.code"),
    ),
  };
}
