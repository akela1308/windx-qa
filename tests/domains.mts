import { Resolver } from "node:dns/promises";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  normalizedDomain,
  requestHostname,
  cabinetHost,
} from "../src/lib/domains/hostname";
import { publicAddress, probeDomain } from "../src/lib/domains/network";
import { FileDomainRepository } from "../src/lib/domains/file-store";
import {
  DomainService,
  domainChallenge,
  ownershipValue,
} from "../src/lib/domains/service";
import { resolveDomain } from "../src/lib/domains/routing";
import {
  DomainError,
  type DomainProviderState,
} from "../src/lib/domains/types";
import { RailwayDomainProvider } from "../src/lib/domains/railway";
import type { Site } from "../src/lib/storage/types";
assert.equal(
  normalizedDomain(" WWW.Example.CO.UK. ").host,
  "www.example.co.uk",
);
assert.equal(normalizedDomain("пример.рф").host, "xn--e1afmkfd.xn--p1ai");
for (const input of [
  "https://example.com",
  "example.com/x",
  "evil@company.com",
  "*.example.com",
  "company.com:443",
  "127.0.0.1",
  "[::1]",
  "co.uk",
  "com",
  "localhost",
  "foo.localhost",
  "foo.local",
  "foo.test",
  "foo.invalid",
  "windx.app",
  "www.windx.app",
  "x.windx.app",
  "x.up.railway.app",
  "a..com",
  "x%2ecom",
  "foo.com?x",
  "foo.com#x",
  "-x.com",
]) {
  assert.throws(() => normalizedDomain(input), DomainError, input);
}
assert.equal(requestHostname("WWW.EXAMPLE.COM:443"), "www.example.com");
assert.equal(requestHostname("good.com@evil.com"), null);
assert.equal(cabinetHost("evil.com"), false);
for (const ip of [
  "127.0.0.1",
  "10.0.0.2",
  "169.254.169.254",
  "172.16.0.1",
  "192.168.0.1",
  "100.64.0.1",
  "0.0.0.0",
  "224.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
  "fe80::1",
  "fc00::1",
  "2001:db8::1",
  "2002:a00:1::1",
  "64:ff9b::a00:1",
]) {
  assert.equal(publicAddress(ip), false, ip);
}
assert.equal(publicAddress("1.1.1.1"), true);
assert.equal(publicAddress("2606:4700:4700::1111"), true);
const original4 = Resolver.prototype.resolve4,
  original6 = Resolver.prototype.resolve6;
try {
  Resolver.prototype.resolve4 = (async () => ["127.0.0.1"]) as unknown as typeof original4;
  Resolver.prototype.resolve6 = (async () => ["::1"]) as unknown as typeof original6;
  assert.equal(
    await probeDomain("local.example.co.uk", "no"),
    "privateAddress",
  );
} finally {
  Resolver.prototype.resolve4 = original4;
  Resolver.prototype.resolve6 = original6;
}
const root = await mkdtemp(path.join(os.tmpdir(), "windx-domains-"));
try {
  const repo = new FileDomainRepository(root),
    at = new Date().toISOString();
  const site: Site = {
    id: "one",
    ownerId: "owner",
    name: "One",
    brief: "private",
    createdAt: at,
    updatedAt: at,
    currentVersion: 1,
    versionCount: 1,
    facts: {},
    published: { slug: "one", version: 1, at },
  };
  let proof: "valid" | "missing" | "unavailable" = "missing",
    calls = 0,
    probe: "valid" | "failed" | "privateAddress" = "valid",
    removeFails = false;
  const providerState: DomainProviderState = {
    id: "provider-one",
    host: "www.example.co.uk",
    records: [
      {
        type: "CNAME",
        name: "www.example.co.uk",
        value: "opaque.up.railway.app",
        valid: true,
      },
    ],
    verified: true,
    certificate: "valid",
    active: true,
  };
  const deps = {
    provider: {
      configured: true,
      async ensure() {
        calls++;
        return structuredClone(providerState);
      },
      async remove() {
        if (removeFails) throw Error("secret provider error");
      },
    },
    verifyTxt: async () => proof,
    probe: async () => probe,
  };
  const service = new DomainService(repo, async () => site, deps);
  let state = await service.create("www.example.co.uk", null);
  const id = state.connection!.id;
  assert.equal(state.connection!.status, "ownership");
  assert.ok(!JSON.stringify(state).includes('"ownerId"'));
  assert.ok(!JSON.stringify(state).includes('"challenge"'));
  assert.ok(!JSON.stringify(state).includes('"providerId"'));
  await assert.rejects(() => service.create("other.co.uk", id), /exists/);
  await service.check(id);
  assert.equal(calls, 0, "No provider allocation before ownership proof");
  proof = "unavailable";
  assert.equal((await service.check(id)).connection!.issue, "dnsUnavailable");
  proof = "valid";
  providerState.records[0].valid = false;
  assert.equal((await service.check(id)).connection!.status, "dns");
  providerState.records[0].valid = true;
  providerState.certificate = "pending";
  assert.equal((await service.check(id)).connection!.status, "tls");
  providerState.certificate = "failed";
  assert.equal((await service.check(id)).connection!.issue, "certificate");
  providerState.certificate = "valid";
  assert.equal((await service.check(id)).connection!.status, "http");
  assert.ok(
    (
      await resolveDomain(
        providerState.host,
        repo,
        async () => site,
        async () => "valid",
      )
    ).binding,
    "HTTP challenge reachable before activation",
  );
  probe = "failed";
  assert.equal((await service.finishCheck(id)).connection!.status, "http");
  probe = "privateAddress";
  assert.equal(
    (await service.finishCheck(id)).connection!.issue,
    "privateAddress",
  );
  probe = "valid";
  state = await service.finishCheck(id);
  assert.equal(state.connection!.status, "active");
  const connection = (await repo.read())[site.id];
  assert.equal(
    domainChallenge(connection).includes(connection.challenge),
    true,
  );
  assert.equal(
    state.connection!.ownershipRecord.value,
    ownershipValue(connection),
  );
  assert.equal(
    (
      await resolveDomain(
        providerState.host,
        repo,
        async () => ({ ...site, ownerId: "new-owner" }),
        async () => "valid",
      )
    ).binding,
    null,
  );
  assert.equal(
    (
      await resolveDomain(
        providerState.host,
        repo,
        async () => site,
        async () => "missing",
      )
    ).binding,
    null,
  );
  assert.equal(
    (
      await resolveDomain(
        providerState.host,
        repo,
        async () => site,
        async () => "unavailable",
      )
    ).unavailable,
    true,
  );
  const other = new DomainService(
    repo,
    async () => ({ ...site, id: "two", ownerId: "other" }),
    deps,
  );
  const second = await other.create(providerState.host, null);
  assert.equal(
    (await other.check(second.connection!.id)).connection!.issue,
    "taken",
  );
  removeFails = true;
  state = await service.disconnect(id);
  assert.equal(state.connection!.status, "removing");
  assert.equal(
    (
      await resolveDomain(
        providerState.host,
        repo,
        async () => site,
        async () => "valid",
      )
    ).binding,
    null,
  );
  removeFails = false;
  await Promise.all([service.disconnect(id), service.disconnect(id)]);
  assert.equal((await service.state()).connection!.status, "disconnected");
  await service.create("another.co.uk", id);
  await assert.rejects(() => service.check(id), /stale/);
  assert.equal(
    (await stat(path.join(root, "domains/connections.json"))).mode & 0o777,
    0o600,
  );
  await Promise.all(
    Array.from({ length: 8 }, () =>
      repo.transaction(async () => {
        await new Promise((r) => setTimeout(r, 5));
      }),
    ),
  );
  assert.equal(Object.keys(await repo.read()).length, 2);
  // API contract: scoped token, real enum names, quota and reconciliation after a lost response.
  const config = {
    token: "TEST_SECRET_NEVER_CLIENT",
    project: "p",
    environment: "e",
    service: "s",
    limit: 2,
  };
  let domains: unknown[] = [],
    create = 0,
    deleted = 0,
    scopeValid = true,
    loseResponse = false;
  const record = {
    id: "id-1",
    domain: "www.example.co.uk",
    environmentId: "e",
    serviceId: "s",
    syncStatus: "ACTIVE",
    status: {
      verified: true,
      verificationToken: "railway-proof",
      verificationDnsHost: "_railway-verify.www.example.co.uk",
      certificateStatus: "CERTIFICATE_STATUS_TYPE_VALID",
      dnsRecords: [
        {
          fqdn: "www.example.co.uk",
          hostlabel: "www",
          recordType: "DNS_RECORD_TYPE_CNAME",
          requiredValue: "opaque.up.railway.app",
          status: "DNS_RECORD_STATUS_PROPAGATED",
        },
      ],
    },
  };
  const fetcher: typeof fetch = async (_url, options) => {
    assert.equal(
      new Headers(options!.headers).get("Project-Access-Token"),
      config.token,
    );
    const { query, variables } = JSON.parse(options!.body as string);
    let data;
    if (query.includes("projectToken"))
      data = {
        projectToken: {
          projectId: scopeValid ? "p" : "foreign",
          environmentId: "e",
        },
      };
    else if (query.includes("customDomainCreate")) {
      create++;
      assert.equal(variables.input.serviceId, "s");
      domains.push(record);
      if (loseResponse) throw Error("lost");
      data = { customDomainCreate: record };
    } else if (query.includes("customDomainDelete")) {
      deleted++;
      assert.equal(variables.id, "id-1");
      domains = [];
      data = { customDomainDelete: true };
    } else data = { domains: { customDomains: domains } };
    return Response.json({ data });
  };
  const api = new RailwayDomainProvider(config, fetcher);
  loseResponse = true;
  const actual = await api.ensure("www.example.co.uk", null);
  assert.equal(create, 1);
  assert.equal(actual.certificate, "valid");
  assert.equal(actual.records.length, 2);
  assert.equal(actual.records[1].type, "TXT");
  await api.ensure("www.example.co.uk", "id-1");
  assert.equal(create, 1);
  scopeValid = false;
  await assert.rejects(
    () => api.ensure("www.example.co.uk", "id-1"),
    /platform/,
  );
  scopeValid = true;
  domains = [record, { ...record, id: "wildcard", domain: "*.windx.app" }];
  await assert.rejects(() => api.ensure("other.co.uk", null), /capacity/);
  assert.equal(create, 1);
  await assert.rejects(() => api.remove("*.windx.app", "wildcard"), /platform/);
  assert.equal(deleted, 0);
  await api.remove("www.example.co.uk", "id-1");
  assert.equal(deleted, 1);
  await assert.rejects(
    () =>
      new RailwayDomainProvider(null, fetcher).ensure(
        "www.example.co.uk",
        null,
      ),
    /platform/,
  );
  console.log(
    "PASS domains: IDNA/PSL, unsafe hosts/IPs, ownership before provisioning, DNS/TLS/HTTPS states, owner isolation, competing claims, disconnect/retry/concurrency, private atomic storage, scoped Railway API, quota, lost response reconciliation",
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
