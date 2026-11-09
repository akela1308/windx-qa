import { z } from "zod";
export const DnsRecordSchema = z.object({
  type: z.enum(["TXT", "CNAME"]),
  name: z.string().max(300),
  value: z.string().max(2048),
  valid: z.boolean(),
});
export type DomainDnsRecord = z.infer<typeof DnsRecordSchema>;
export const DomainConnectionSchema = z.object({
  id: z.uuid(),
  siteId: z.string().regex(/^[a-z0-9-]+$/),
  ownerId: z.string().min(1).max(150),
  host: z.string().max(253),
  nonce: z.string().regex(/^[a-f0-9]{64}$/),
  challenge: z.string().regex(/^[a-f0-9]{64}$/),
  createdAt: z.string(),
  updatedAt: z.string(),
  checkedAt: z.string().nullable(),
  ownershipVerified: z.boolean(),
  providerId: z.string().max(150).nullable(),
  records: z.array(DnsRecordSchema).max(10),
  status: z.enum([
    "ownership",
    "platform",
    "dns",
    "tls",
    "http",
    "active",
    "removing",
    "disconnected",
    "error",
  ]),
  issue: z.enum([
    "none",
    "ownership",
    "dnsUnavailable",
    "platform",
    "capacity",
    "taken",
    "certificate",
    "http",
    "privateAddress",
    "stale",
    "busy",
  ]),
});
export type DomainConnection = z.infer<typeof DomainConnectionSchema>;
export type DomainRegistry = Record<string, DomainConnection>;
export type DomainClientState = {
  configured: boolean;
  connection:
    | (Omit<
        DomainConnection,
        "ownerId" | "challenge" | "providerId" | "nonce"
      > & { ownershipRecord: DomainDnsRecord })
    | null;
  published: boolean;
};
export type DomainIssue =
  DomainConnection["issue"] | "invalid" | "account" | "exists" | "notFound";
export class DomainError extends Error {
  constructor(public code: DomainIssue) {
    super(code);
  }
}
export type DomainProviderState = {
  id: string;
  host: string;
  records: DomainDnsRecord[];
  verified: boolean;
  certificate: "pending" | "valid" | "failed";
  active: boolean;
};
export interface DomainProvider {
  configured: boolean;
  ensure(host: string, id: string | null): Promise<DomainProviderState>;
  remove(host: string, id: string): Promise<void>;
}
export interface DomainRepository {
  read(): Promise<DomainRegistry>;
  transaction<T>(run: (registry: DomainRegistry) => Promise<T>): Promise<T>;
}
export type DomainDependencies = {
  provider: DomainProvider;
  verifyTxt: (
    host: string,
    value: string,
  ) => Promise<"valid" | "missing" | "unavailable">;
  probe: (
    host: string,
    expected: string,
  ) => Promise<"valid" | "failed" | "privateAddress">;
  now?: () => Date;
};
