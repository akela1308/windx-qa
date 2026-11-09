import { FileSiteStore } from "@/lib/storage/file-store";
import { dataRoot } from "@/lib/auth/accounts";
import { domainRepository } from "./runtime";
import { verifyDomainTxt } from "./network";
import { resolveDomain } from "./routing";
import { requestHostname } from "./hostname";
export async function publicDomain(host: string) {
  const store = new FileSiteStore(dataRoot());
  return resolveDomain(
    host,
    domainRepository(),
    (id) => store.getSite(id),
    verifyDomainTxt,
  );
}
export async function customRequestAllowed(request: Request, siteId: string) {
  const marker = request.headers.get("x-windx-custom-site");
  if (!marker) return true; // Proxy удаляет входящий marker и выставляет его только для проверенного домена.
  const host = requestHostname(
    request.headers.get("x-windx-request-host") ?? "",
  );
  if (!host || marker !== siteId) return false;
  const { binding } = await publicDomain(host);
  return (
    binding?.site.id === siteId &&
    binding.connection.status === "active" &&
    !!binding.site.published
  );
}
