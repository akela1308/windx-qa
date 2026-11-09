import { randomBytes, randomUUID } from "node:crypto";
import type { Site } from "@/lib/storage/types";
import { normalizedDomain } from "./hostname";
import {
  DomainError,
  type DomainConnection,
  type DomainRepository,
  type DomainDependencies,
  type DomainClientState,
} from "./types";
export const ownershipValue = (connection: DomainConnection) =>
  `windx-verification=${connection.nonce}`;
export const domainChallenge = (connection: DomainConnection) =>
  `windx-domain:${connection.id}:${connection.challenge}`;
export function clientDomainState(
  connection: DomainConnection | null,
  configured: boolean,
  published: boolean,
): DomainClientState {
  if (!connection) return { configured, published, connection: null };
  const {
    ownerId: _owner,
    challenge: _challenge,
    providerId: _provider,
    nonce: _nonce,
    ...safe
  } = connection;
  void _owner;
  void _challenge;
  void _provider;
  void _nonce;
  return {
    configured,
    published,
    connection: {
      ...safe,
      ownershipRecord: {
        type: "TXT",
        name: `_windx.${connection.host}`,
        value: ownershipValue(connection),
        valid: connection.ownershipVerified,
      },
    },
  };
}
export class DomainService {
  constructor(
    private repo: DomainRepository,
    private site: () => Promise<Site>,
    private deps: DomainDependencies,
  ) {}
  private now() {
    return (this.deps.now?.() ?? new Date()).toISOString();
  }
  async state() {
    const site = await this.site(),
      registry = await this.repo.read(),
      c = registry[site.id];
    return clientDomainState(
      c?.ownerId === site.ownerId ? c : null,
      this.deps.provider.configured,
      !!site.published,
    );
  }
  async create(input: string, expected: string | null) {
    const host = normalizedDomain(input).host;
    return this.repo.transaction(async (registry) => {
      const site = await this.site(),
        current = registry[site.id];
      if ((current?.id ?? null) !== expected) throw new DomainError("stale");
      if (current && current.status !== "disconnected")
        throw new DomainError("exists");
      const at = this.now();
      registry[site.id] = {
        id: randomUUID(),
        siteId: site.id,
        ownerId: site.ownerId!,
        host,
        nonce: randomBytes(32).toString("hex"),
        challenge: randomBytes(32).toString("hex"),
        createdAt: at,
        updatedAt: at,
        checkedAt: null,
        ownershipVerified: false,
        providerId: null,
        records: [],
        status: "ownership",
        issue: "none",
      };
      return clientDomainState(
        registry[site.id],
        this.deps.provider.configured,
        !!site.published,
      );
    });
  }
  async check(expected: string) {
    return this.repo.transaction(async (registry) => {
      const site = await this.site(),
        c = registry[site.id];
      if (!c || c.id !== expected || c.ownerId !== site.ownerId)
        throw new DomainError("stale");
      if (c.status === "disconnected" || c.status === "removing")
        throw new DomainError("stale");
      c.checkedAt = this.now();
      c.updatedAt = c.checkedAt;
      const proof = await this.deps.verifyTxt(c.host, ownershipValue(c));
      if (proof !== "valid") {
        c.ownershipVerified = false;
        c.status = "ownership";
        c.issue = proof === "missing" ? "ownership" : "dnsUnavailable";
        return clientDomainState(
          c,
          this.deps.provider.configured,
          !!site.published,
        );
      }
      const taken = Object.values(registry).some(
        (other) =>
          other.id !== c.id &&
          other.host === c.host &&
          other.ownershipVerified &&
          other.status !== "disconnected",
      );
      if (taken) {
        c.status = "error";
        c.issue = "taken";
        return clientDomainState(
          c,
          this.deps.provider.configured,
          !!site.published,
        );
      }
      c.ownershipVerified = true;
      c.issue = "none";
      c.status = "platform";
      try {
        const state = await this.deps.provider.ensure(c.host, c.providerId);
        c.providerId = state.id;
        c.records = state.records;
        if (state.host !== c.host) throw new DomainError("platform");
        if (
          !state.verified ||
          !state.records.some((record) => record.type === "CNAME") ||
          state.records.some((record) => !record.valid)
        ) {
          c.status = "dns";
          return clientDomainState(
            c,
            this.deps.provider.configured,
            !!site.published,
          );
        }
        if (state.certificate !== "valid") {
          c.status = "tls";
          c.issue = state.certificate === "failed" ? "certificate" : "none";
          return clientDomainState(
            c,
            this.deps.provider.configured,
            !!site.published,
          );
        }
        if (!state.active) {
          c.status = "platform";
          return clientDomainState(
            c,
            this.deps.provider.configured,
            !!site.published,
          );
        }
        // Сохраняем проверенный промежуточный этап для отдельной HTTPS-пробы.
        // Она идёт после транзакции, чтобы challenge увидел уже записанный домен.
        c.status = "http";
        return clientDomainState(
          c,
          this.deps.provider.configured,
          !!site.published,
        );
      } catch (error) {
        c.status = "error";
        c.issue =
          error instanceof DomainError &&
          ["platform", "capacity", "busy"].includes(error.code)
            ? (error.code as "platform" | "capacity" | "busy")
            : "platform";
        return clientDomainState(
          c,
          this.deps.provider.configured,
          !!site.published,
        );
      }
    });
  }
  async finishCheck(expected: string) {
    const site = await this.site(),
      c = (await this.repo.read())[site.id];
    if (
      !c ||
      c.id !== expected ||
      c.ownerId !== site.ownerId ||
      c.status !== "http"
    )
      return this.state();
    const probe = await this.deps.probe(c.host, domainChallenge(c));
    return this.repo.transaction(async (registry) => {
      const currentSite = await this.site(),
        current = registry[currentSite.id];
      if (
        !current ||
        current.id !== expected ||
        current.ownerId !== currentSite.ownerId ||
        current.status !== "http"
      )
        throw new DomainError("stale");
      current.checkedAt = this.now();
      current.updatedAt = current.checkedAt;
      const proof = await this.deps.verifyTxt(
        current.host,
        ownershipValue(current),
      );
      if (proof !== "valid") {
        current.ownershipVerified = false;
        current.status = "ownership";
        current.issue = proof === "missing" ? "ownership" : "dnsUnavailable";
        return clientDomainState(
          current,
          this.deps.provider.configured,
          !!currentSite.published,
        );
      }
      current.status = probe === "valid" ? "active" : "http";
      current.issue =
        probe === "valid"
          ? "none"
          : probe === "privateAddress"
            ? "privateAddress"
            : "http";
      return clientDomainState(
        current,
        this.deps.provider.configured,
        !!currentSite.published,
      );
    });
  }
  async disconnect(expected: string) {
    // Сначала отключаем маршрутизацию. Ошибка хостинга не должна оставить сайт
    // доступным по адресу, который владелец уже отсоединил.
    const state = await this.repo.transaction(async (registry) => {
      const site = await this.site(),
        c = registry[site.id];
      if (!c || c.id !== expected || c.ownerId !== site.ownerId)
        throw new DomainError("stale");
      if (c.status !== "disconnected") {
        c.status = "removing";
        c.updatedAt = this.now();
      }
      return { ...c };
    });
    let removed = false;
    try {
      if (state.providerId)
        await this.deps.provider.remove(state.host, state.providerId);
      removed = true;
    } catch {}
    return this.repo.transaction(async (registry) => {
      const site = await this.site(),
        c = registry[site.id];
      if (!c || c.id !== expected || c.ownerId !== site.ownerId)
        throw new DomainError("stale");
      if (c.status === "disconnected")
        return clientDomainState(
          c,
          this.deps.provider.configured,
          !!site.published,
        );
      c.updatedAt = this.now();
      c.status = removed ? "disconnected" : "removing";
      c.issue = removed ? "none" : "platform";
      if (removed) {
        c.providerId = null;
        c.records = [];
        c.ownershipVerified = false;
      }
      return clientDomainState(
        c,
        this.deps.provider.configured,
        !!site.published,
      );
    });
  }
}
