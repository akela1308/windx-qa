import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { FileSiteStore } from "../src/lib/storage/file-store";
import { FileDomainRepository } from "../src/lib/domains/file-store";
import {
  DomainService,
  domainChallenge,
  ownershipValue,
} from "../src/lib/domains/service";
import { createSession } from "../src/lib/auth/accounts";
import { guestIdentity } from "../src/lib/auth/guest";
import type { Site, SiteVersion } from "../src/lib/storage/types";
const root = await mkdtemp(path.join(os.tmpdir(), "windx-domains-http-"));
process.env.WINDX_DATA_DIR = root;
const port = 3202,
  base = `http://127.0.0.1:${port}`,
  raw = new FileSiteStore(root),
  repo = new FileDomainRepository(root),
  at = new Date().toISOString();
const doc = JSON.parse(
  await readFile("docs/experiment-1c/outputs/bike/light.json", "utf8"),
);
doc.factsToConfirm = [];
doc.sections.push({
  composition: "contact.form",
  id: "domain-form",
  tone: "default",
  props: { title: "Ask", submitLabel: "Send" },
});
const site: Site = {
  id: "domain-one",
  ownerId: "owner",
  name: "PRIVATE_DOMAIN_SITE",
  brief: "PRIVATE_DOMAIN_BRIEF",
  facts: {},
  createdAt: at,
  updatedAt: at,
  currentVersion: 2,
  versionCount: 2,
  enquiryRecipient: { email: "owner@example.test", confirmedAt: at },
  published: { slug: "domain-one", version: 1, at },
};
const v = (n: number): SiteVersion => ({
  n,
  createdAt: at,
  action: "create",
  request: "private",
  reply: "private",
  doc: structuredClone(doc),
  demo: true,
  usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, estimated: false },
});
const old = v(1),
  draft = v(2);
draft.doc.meta.title = "PRIVATE_UNPUBLISHED_TITLE";
await raw.saveSite(site);
await raw.addVersion(site.id, old);
await raw.addVersion(site.id, draft);
await raw.prepareEnquiryInbox(site.id);
await raw.saveSite({ ...site, id: "action-domain", published: undefined });
await raw.addVersion("action-domain", old);
const service = new DomainService(repo, async () => site, {
  provider: {
    configured: false,
    async ensure() {
      throw Error("not configured");
    },
    async remove() {},
  },
  verifyTxt: async () => "missing",
  probe: async () => "failed",
});
const created = await service.create("www.example.co.uk", null),
  id = created.connection!.id;
await repo.transaction(async (data) => {
  data[site.id].ownershipVerified = true;
  data[site.id].status = "active";
});
const connection = (await repo.read())[site.id],
  dnsFile = path.join(root, "test-dns.json"),
  dnsKey = `_windx.${connection.host}`;
const dns = async (value: string) =>
  writeFile(dnsFile, JSON.stringify({ [dnsKey]: value }));
await dns(ownershipValue(connection));
const owner = await createSession({ id: "owner", email: "owner@example.test" }),
  foreign = await createSession({ id: "other", email: "other@example.test" }),
  guest = await createSession(guestIdentity());
const server = spawn(
  process.execPath,
  [
    "--import",
    path.resolve("tests/helpers/domain-dns-bootstrap.mjs"),
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    env: {
      ...process.env,
      WINDX_TEST_DNS_FIXTURE: dnsFile,
      WINDX_DOMAIN_RAILWAY_TOKEN: "",
      AI_DEMO: "1",
      NODE_ENV: "production",
    },
    stdio: "pipe",
  },
);
let logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
async function request(
  url: string,
  host = connection.host,
  method = "GET",
  body = "",
  extra: Record<string, string> = {},
) {
  return new Promise<{
    status: number;
    headers: Record<string, unknown>;
    body: string;
  }>((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: "127.0.0.1",
        port,
        path: url,
        method,
        headers: {
          host,
          ...(method === "POST"
            ? {
                "content-type": "application/x-www-form-urlencoded",
                origin: `https://${host}`,
                accept: "application/json",
              }
            : {}),
          ...extra,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () =>
          resolve({
            status: res.statusCode!,
            headers: res.headers,
            body: Buffer.concat(chunks).toString(),
          }),
        );
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/login")).status === 200) break;
    } catch {}
    if (server.exitCode !== null) throw Error(logs);
    await new Promise((r) => setTimeout(r, 100));
  }
  // Next.js 16 читает исходник оптимизированной картинки без Host.
  // Проверяем всю витрину, снимок редактора и знак Google, а не только HTML.
  const showcase = [
    "newsprint",
    "soft-clay",
    "signal",
    "night-shift",
    "poster-duo",
    "deep-ink",
    "swiss",
    "monotone",
    "warm-editorial",
    "editor",
  ];
  for (const asset of [
    ...showcase.map((name) => `/showcase/${name}.jpg`),
    "/brands/google-g.png",
  ]) {
    const image = await fetch(
      `${base}/_next/image?url=${encodeURIComponent(asset)}&w=640&q=75`,
    );
    assert.equal(image.status, 200, `optimized ${asset}`);
    assert.match(image.headers.get("content-type") ?? "", /^image\//);
    assert.ok((await image.arrayBuffer()).byteLength > 100, asset);
  }
  for (const privatePath of ["/sites", "/login", "/preview/domain-one/2"]) {
    const image = await fetch(
      `${base}/_next/image?url=${encodeURIComponent(privatePath)}&w=640&q=75`,
    );
    assert.notEqual(
      image.status,
      200,
      `optimizer must not expose ${privatePath}`,
    );
  }
  let live = await request("/");
  assert.equal(live.status, 200);
  assert.match(live.body, /action="\/_enquiry"/);
  assert.ok(!live.body.includes("PRIVATE_UNPUBLISHED_TITLE"));
  assert.equal(live.headers["x-windx-version"], "1");
  const token = [...live.body.matchAll(/name="token" value="([^"]+)"/g)][0][1];
  const submission = new URLSearchParams({
    token,
    submission: "domain-http",
    name: "Fixture",
    contact: "visitor@example.test",
    message: "PRIVATE_CUSTOM_ENQUIRY",
    extra_reference: "",
  }).toString();
  assert.equal(
    (await request("/_enquiry", connection.host, "POST", submission)).status,
    200,
  );
  assert.equal((await raw.listEnquiries(site.id)).length, 1);
  assert.equal(
    (await request("/.well-known/windx-domain-check")).body,
    domainChallenge(connection),
  );
  for (const url of [
    "/sites",
    "/login",
    "/domain-check",
    "/preview/domain-one/2",
    "/live/domain-one",
  ]) {
    const r = await request(url);
    assert.equal(r.status, 404, url);
    assert.match(String(r.headers["cache-control"]), /no-store/);
    assert.ok(!r.body.includes("PRIVATE_DOMAIN"));
  }
  const spoof = await request("/sites", "unknown.example.co.uk", "GET", "", {
    "x-windx-custom-site": site.id,
    "x-windx-request-host": "localhost",
  });
  assert.equal(spoof.status, 404);
  await raw.saveSite({ ...site, published: undefined });
  assert.equal((await request("/")).status, 404);
  assert.equal(
    (await request("/_enquiry", connection.host, "POST", submission)).status,
    404,
  );
  assert.equal((await request("/.well-known/windx-domain-check")).status, 200);
  await raw.saveSite({
    ...site,
    published: { ...site.published!, version: 2, at: new Date().toISOString() },
  });
  live = await request("/");
  assert.equal(live.status, 200);
  assert.match(live.body, /PRIVATE_UNPUBLISHED_TITLE/);
  assert.equal(
    (await request("/_enquiry", connection.host, "POST", submission)).status,
    409,
  );
  await dns("wrong-proof");
  assert.equal((await request("/")).status, 404);
  await dns("unavailable");
  assert.equal((await request("/")).status, 503);
  await dns(ownershipValue(connection));
  await raw.saveSite({ ...site, ownerId: "new-owner" });
  assert.equal((await request("/")).status, 404);
  await raw.saveSite(site);
  await repo.transaction(async (data) => {
    data[site.id].status = "removing";
  });
  assert.equal((await request("/")).status, 404);
  await repo.transaction(async (data) => {
    data[site.id].status = "active";
  });
  assert.equal(
    (await request("/", `domain-one.localhost:${port}`)).status,
    200,
  );
  const missing = await request("/", `missing.localhost:${port}`);
  assert.equal(missing.status, 404);
  assert.match(String(missing.headers["cache-control"]), /no-store/);
  const manifest = JSON.parse(
      await readFile(".next/server/server-reference-manifest.json", "utf8"),
    ),
    actions = Object.entries(manifest.node) as [
      string,
      { exportedName: string },
    ][];
  const { encodeReply } = createRequire(import.meta.url)(
    "next/dist/compiled/react-server-dom-turbopack/client.node",
  ) as { encodeReply: (args: unknown[]) => Promise<string | FormData> };
  async function action(args: unknown[], token = owner, name = "domainAction") {
    const actionId = actions.find(([, a]) => a.exportedName === name)?.[0];
    assert.ok(actionId);
    const body = await encodeReply(args),
      r = await fetch(base + "/sites/action-domain", {
        method: "POST",
        headers: {
          "Next-Action": actionId,
          origin: base,
          ...(token ? { cookie: `__Host-windx_session=${token}` } : {}),
          ...(typeof body === "string"
            ? { "content-type": "text/plain;charset=UTF-8" }
            : {}),
        },
        body,
        redirect: "manual",
      });
    const text = await r.text();
    return text
      .split("\n")
      .flatMap((line) => {
        try {
          return [JSON.parse(line.slice(line.indexOf(":") + 1))];
        } catch {
          return [];
        }
      })
      .find((v) => v && typeof v.ok === "boolean");
  }
  for (const token of ["", foreign, guest])
    assert.equal(
      (
        await action(
          ["action-domain", "create", null, "private-domain.co.uk"],
          token,
        )
      ).ok,
      false,
    );
  const a = await action([
    "action-domain",
    "create",
    null,
    "private-domain.co.uk",
  ]);
  assert.equal(a.ok, true);
  assert.equal(a.state.configured, false);
  const privateId = a.state.connection.id;
  const blockedDelete = await action(["action-domain"], owner, "deleteAction");
  assert.equal(blockedDelete.ok, false);
  assert.ok(await raw.getSite("action-domain"));
  for (const token of ["", foreign]) {
    const text = await (
      await fetch(base + "/sites/action-domain", {
        headers: token ? { cookie: `__Host-windx_session=${token}` } : {},
      })
    ).text();
    assert.ok(!text.includes(privateId));
    assert.ok(!text.includes(a.state.connection.ownershipRecord.value));
  }
  const own = await fetch(base + "/sites/action-domain", {
    headers: { cookie: `__Host-windx_session=${owner}` },
  });
  assert.match(own.headers.get("cache-control") ?? "", /private/);
  assert.ok((await own.text()).includes(privateId));
  assert.equal(
    (await action(["action-domain", "check", privateId])).state.connection
      .status,
    "ownership",
  );
  assert.equal(
    (await action(["action-domain", "disconnect", privateId])).state.connection
      .status,
    "disconnected",
  );
  assert.equal(
    (await action(["action-domain"], owner, "deleteAction")).ok,
    true,
  );
  assert.equal(await raw.getSite("action-domain"), null);
  assert.equal((await raw.getSite(site.id))!.currentVersion, 2);
  assert.equal((await raw.listVersions(site.id)).length, 2);
  assert.equal(await raw.getPendingEdit(site.id), null);
  console.log(
    "PASS domains HTTP: optimized public showcase/brand assets and private optimizer rejection, production Host routing, published version only, enquiries, challenge, unknown-host/cabinet isolation, header spoof rejection, ownership loss, DNS failure, Take offline/republish, disconnect, member-only actions and private state; isolated DNS fixture, no external domain provisioned",
  );
} catch (e) {
  console.error(logs.slice(-1800));
  throw e;
} finally {
  server.kill("SIGTERM");
  await new Promise<void>((r) => server.once("exit", () => r()));
  await rm(root, { recursive: true, force: true });
}
