import { z } from "zod";
import {
  DomainError,
  type DomainProvider,
  type DomainProviderState,
} from "./types";
const Status = z.object({
  verified: z.boolean(),
  verificationToken: z.string().nullable().optional(),
  verificationDnsHost: z.string().nullable().optional(),
  certificateStatus: z.string(),
  dnsRecords: z
    .array(
      z.object({
        fqdn: z.string().max(300),
        hostlabel: z.string().max(300),
        recordType: z.string(),
        requiredValue: z.string().max(2048),
        status: z.string(),
      }),
    )
    .max(10),
});
const Domain = z.object({
  id: z.string().min(1).max(150),
  domain: z.string(),
  environmentId: z.string(),
  serviceId: z.string(),
  syncStatus: z.string(),
  status: Status,
});
const fields =
  "id domain environmentId serviceId syncStatus status { verified verificationToken verificationDnsHost certificateStatus dnsRecords { fqdn hostlabel recordType requiredValue status } }";
type Config = {
  token: string;
  project: string;
  environment: string;
  service: string;
  port?: number;
  limit: number;
};
export function railwayDomainConfig(): Config | null {
  const token = process.env.WINDX_DOMAIN_RAILWAY_TOKEN,
    project = process.env.RAILWAY_PROJECT_ID,
    environment = process.env.RAILWAY_ENVIRONMENT_ID,
    service = process.env.RAILWAY_SERVICE_ID;
  if (
    !token ||
    ![project, environment, service].every(
      (v) => typeof v === "string" && /^[a-f0-9-]{36}$/.test(v),
    )
  )
    return null;
  const port = Number(process.env.PORT),
    limit = Number(process.env.WINDX_RAILWAY_DOMAIN_LIMIT ?? 2);
  return {
    token,
    project: project!,
    environment: environment!,
    service: service!,
    ...(port > 0 && port <= 65535 ? { port } : {}),
    limit: Number.isInteger(limit) && limit > 0 ? limit : 2,
  };
}
export class RailwayDomainProvider implements DomainProvider {
  readonly configured: boolean;
  constructor(
    private config: Config | null = railwayDomainConfig(),
    private fetcher: typeof fetch = fetch,
  ) {
    this.configured = !!config;
  }
  private async api(query: string, variables: Record<string, unknown>) {
    if (!this.config) throw new DomainError("platform");
    try {
      const response = await this.fetcher(
        "https://backboard.railway.com/graphql/v2",
        {
          method: "POST",
          redirect: "error",
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
          headers: {
            "Content-Type": "application/json",
            "Project-Access-Token": this.config.token,
          },
          body: JSON.stringify({ query, variables }),
        },
      );
      if (!response.ok)
        throw new DomainError(response.status === 429 ? "busy" : "platform");
      const reader = response.body?.getReader();
      let size = 0;
      const chunks: Uint8Array[] = [];
      if (reader)
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 128_000) {
            await reader.cancel();
            throw new DomainError("platform");
          }
          chunks.push(value);
        }
      const json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (json.errors?.length)
        throw new DomainError(
          json.errors.some((e: { message?: string }) =>
            /limit|quota|maximum number/i.test(e.message ?? ""),
          )
            ? "capacity"
            : "platform",
        );
      return json.data;
    } catch (error) {
      throw error instanceof DomainError ? error : new DomainError("platform");
    }
  }
  private async list() {
    const config = this.config;
    if (!config) throw new DomainError("platform");
    const scope = await this.api(
      "query { projectToken { projectId environmentId } }",
      {},
    );
    if (
      scope?.projectToken?.projectId !== config.project ||
      scope?.projectToken?.environmentId !== config.environment
    )
      throw new DomainError("platform");
    const data = await this.api(
      `query($projectId:String!,$environmentId:String!,$serviceId:String!){ domains(projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId){customDomains { ${fields} }} }`,
      {
        projectId: config.project,
        environmentId: config.environment,
        serviceId: config.service,
      },
    );
    const domains = z
      .array(Domain)
      .max(100)
      .parse(data?.domains?.customDomains);
    if (
      domains.some(
        (d) =>
          d.serviceId !== config.service ||
          d.environmentId !== config.environment,
      )
    )
      throw new DomainError("platform");
    return domains;
  }
  private state(raw: z.infer<typeof Domain>): DomainProviderState {
    const records: DomainProviderState["records"] = [];
    for (const record of raw.status.dnsRecords) {
      const type =
        record.recordType === "DNS_RECORD_TYPE_CNAME"
          ? "CNAME"
          : record.recordType === "DNS_RECORD_TYPE_TXT"
            ? "TXT"
            : null;
      if (!type) throw new DomainError("platform");
      records.push({
        type,
        name: record.fqdn.replace(/\.$/, ""),
        value: record.requiredValue,
        valid: record.status === "DNS_RECORD_STATUS_PROPAGATED",
      });
    }
    const verification = raw.status.verificationToken,
      host = raw.status.verificationDnsHost;
    if (verification) {
      if (!host) throw new DomainError("platform");
      if (
        !records.some(
          (r) =>
            r.type === "TXT" && r.name === host && r.value === verification,
        )
      )
        records.push({
          type: "TXT",
          name: host.replace(/\.$/, ""),
          value: verification,
          valid: raw.status.verified,
        });
    }
    return {
      id: raw.id,
      host: raw.domain.toLowerCase(),
      records,
      verified: raw.status.verified,
      certificate:
        raw.status.certificateStatus === "CERTIFICATE_STATUS_TYPE_VALID"
          ? "valid"
          : raw.status.certificateStatus ===
              "CERTIFICATE_STATUS_TYPE_ISSUE_FAILED"
            ? "failed"
            : "pending",
      active: raw.syncStatus === "ACTIVE",
    };
  }
  async ensure(host: string, id: string | null) {
    const domains = await this.list();
    let found = domains.find((d) => d.domain === host);
    if (id && found?.id !== id) throw new DomainError("platform");
    if (!found) {
      if (domains.length >= this.config!.limit)
        throw new DomainError("capacity");
      const input = {
        projectId: this.config!.project,
        environmentId: this.config!.environment,
        serviceId: this.config!.service,
        domain: host,
        ...(this.config!.port ? { targetPort: this.config!.port } : {}),
      };
      try {
        const result = await this.api(
          `mutation($input:CustomDomainCreateInput!){customDomainCreate(input:$input){${fields}}}`,
          { input },
        );
        found = Domain.parse(result?.customDomainCreate);
      } catch (error) {
        // При обрыве ответа не создаём повторно: сначала ищем результат в своём сервисе.
        found = (await this.list()).find((d) => d.domain === host);
        if (!found) throw error;
      }
    }
    if (
      found.domain !== host ||
      found.environmentId !== this.config!.environment ||
      found.serviceId !== this.config!.service
    )
      throw new DomainError("platform");
    return this.state(found);
  }
  async remove(host: string, id: string) {
    const domains = await this.list(),
      found = domains.find((d) => d.id === id);
    if (!found) return;
    if (
      found.domain !== host ||
      host.includes("*") ||
      host.endsWith(".windx.app")
    )
      throw new DomainError("platform");
    const result = await this.api(
      "mutation($id:String!){customDomainDelete(id:$id)}",
      { id },
    );
    if (result?.customDomainDelete !== true) throw new DomainError("platform");
  }
}
