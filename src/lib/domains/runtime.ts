import { dataRoot } from "@/lib/auth/accounts";
import { FileDomainRepository } from "./file-store";
import { RailwayDomainProvider } from "./railway";
import { verifyDomainTxt, probeDomain } from "./network";
import { DomainService } from "./service";
import type { Site } from "@/lib/storage/types";
export const domainRepository = () => new FileDomainRepository(dataRoot());
export const domainService = (site: () => Promise<Site>) =>
  new DomainService(domainRepository(), site, {
    provider: new RailwayDomainProvider(),
    verifyTxt: verifyDomainTxt,
    probe: probeDomain,
  });
