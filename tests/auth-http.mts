import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileSiteStore } from "../src/lib/storage/file-store";
import { createSession } from "../src/lib/auth/accounts";
import { request as httpRequest } from "node:http";
import { createRequire } from "node:module";
import { guestIdentity } from "../src/lib/auth/guest";
import type { Site, SiteVersion } from "../src/lib/storage/types";

// Только локальная production-сборка и одноразовые файлы. Платный AI не вызывается.
const root = await mkdtemp(path.join(os.tmpdir(), "windx-auth-http-"));
process.env.WINDX_DATA_DIR = root;
const port = 3197, base = `http://127.0.0.1:${port}`;
const raw = new FileSiteStore(root);
const fixture = JSON.parse(await readFile("docs/experiment-1c/outputs/bike/light.json", "utf8"));
const now = new Date().toISOString();
const site: Site = { id: "site-a", ownerId: "account-a", name: "PRIVATE_ACCOUNT_A", brief: "SECRET_BRIEF_A", createdAt: now, updatedAt: now, currentVersion: 2, versionCount: 2, facts: {}, published: { slug: "public-a", version: 1, at: now } };
await raw.saveSite(site);
await raw.saveSite({ ...site, id: "site-b", ownerId: "account-b", name: "PRIVATE_ACCOUNT_B", published: undefined });
await raw.saveSite({ ...site, id: "legacy", ownerId: undefined, name: "PRIVATE_LEGACY", published: undefined });
function version(n: number, title: string): SiteVersion {
  const doc = structuredClone(fixture); doc.meta.title = title;
  return { n, createdAt: now, action: "create", request: "SECRET_REQUEST_A", reply: "Private reply", doc, demo: true, usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, estimated: false } };
}
await raw.addVersion(site.id, version(1, "PUBLIC_VERSION_A"));
await raw.addVersion(site.id, version(2, "SECRET_DRAFT_A"));
await raw.savePendingEdit(site.id, { id: "pending-a", baseVersion: 2, version: version(3, "SECRET_PENDING_A") });
const tokenA = await createSession({ id: "account-a", email: "a@example.test" });
const tokenB = await createSession({ id: "account-b", email: "b@example.test" });
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env: { ...process.env, AI_DEMO: "1", NODE_ENV: "production", GOOGLE_CLIENT_ID: "synthetic-test-client", GOOGLE_CLIENT_SECRET: "synthetic-test-secret", WINDX_AUTH_ORIGIN: "https://www.windx.app" }, stdio: "pipe" });
let logs = "";
server.stdout.on("data", (d) => { logs += d; }); server.stderr.on("data", (d) => { logs += d; });
const get = (url: string, token = "") => fetch(`${base}${url}`, { headers: token ? { Cookie: `__Host-windx_session=${token}` } : {}, redirect: "manual" });
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await get("/login")).status === 200) break; } catch {}
    if (server.exitCode !== null) throw new Error(logs);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  for (const [token, own, other] of [[tokenA, "PRIVATE_ACCOUNT_A", "PRIVATE_ACCOUNT_B"], [tokenB, "PRIVATE_ACCOUNT_B", "PRIVATE_ACCOUNT_A"]]) {
    const response = await get("/sites", token), body = await response.text();
    assert.ok(body.includes(own)); assert.ok(!body.includes(other)); assert.ok(!body.includes("PRIVATE_LEGACY"));
    assert.match(response.headers.get("cache-control") ?? "", /private/);
  }
  for (const url of ["/sites/site-a", "/preview/site-a/2", "/preview/site-a/pending?edit=pending-a"]) {
    const denied = await get(url, tokenB), body = await denied.text();
    assert.ok(!body.includes("SECRET_BRIEF_A") && !body.includes("SECRET_REQUEST_A") && !body.includes("SECRET_DRAFT_A") && !body.includes("SECRET_PENDING_A"), url);
    const anonymous = await get(url), anonBody = await anonymous.text();
    assert.ok(!anonBody.includes("SECRET_BRIEF_A") && !anonBody.includes("SECRET_DRAFT_A"));
  }
  assert.ok((await (await get("/preview/site-a/2", tokenA)).text()).includes("SECRET_DRAFT_A"));
  assert.ok((await (await get("/preview/site-a/pending?edit=pending-a", tokenA)).text()).includes("SECRET_PENDING_A"));
  const live = await get("/live/public-a"), html = await live.text();
  assert.equal(live.status, 200); assert.ok(html.includes("PUBLIC_VERSION_A")); assert.ok(!html.includes("SECRET_DRAFT_A"));
  // Прямые POST обходят интерфейс и доказывают, что защита стоит на сервере.
  const manifest = JSON.parse(await readFile(".next/server/server-reference-manifest.json", "utf8"));
  const actions = Object.entries(manifest.node) as [string, { exportedName: string }][];
  const require = createRequire(import.meta.url);
  const { encodeReply } = require("next/dist/compiled/react-server-dom-turbopack/client.node") as { encodeReply: (args: unknown[]) => Promise<string | FormData> };
  const post = async (name: string, args: unknown[], token: string) => {
    const action = actions.find(([, value]) => value.exportedName === name)?.[0];
    assert.ok(action, name);
    const body = await encodeReply(args);
    const pathname = name === "createSiteAction" ? "/" : name === "loginAction" ? "/login" : "/sites/site-a";
    const response = await fetch(`${base}${pathname}`, { method: "POST", headers: { "Next-Action": action, ...(typeof body === "string" ? { "Content-Type": "text/plain;charset=UTF-8" } : {}), Origin: base, Cookie: `__Host-windx_session=${token}` }, body, redirect: "manual" });
    return { response, body: await response.text() };
  };
  for (const [name, args] of [["renameAction", [site.id, "STOLEN"]], ["deleteAction", [site.id]], ["starAction", [site.id, true]], ["unpublishAction", [site.id]], ["duplicateAction", [site.id]], ["revertAction", [site.id, 1]]] as [string, unknown[]][]) await post(name, args, tokenB);
  const unchanged = await raw.getSite(site.id);
  assert.equal(unchanged?.name, site.name); assert.ok(unchanged?.published); assert.equal(unchanged?.currentVersion, 2); assert.ok(!unchanged?.starred);
  assert.equal((await raw.listSites()).length, 3);
  await post("renameAction", [site.id, "OWNER_RENAMED"], tokenA);
  assert.equal((await raw.getSite(site.id))?.name, "OWNER_RENAMED");
  // За прокси Request.url может содержать внутренний origin. Решение о каноничном
  // домене должно использовать Host; callback всегда остаётся фиксированным.
  const oauth = await new Promise<{ status: number; location: string; cookie: string }>((resolve, reject) => {
    const req = httpRequest(`${base}/auth/google`, { headers: { host: "www.windx.app" } }, (res) => {
      res.resume();
      resolve({ status: res.statusCode!, location: res.headers.location!, cookie: res.headers["set-cookie"]![0] });
    });
    req.on("error", reject); req.end();
  });
  assert.equal(oauth.status, 303);
  const googleUrl = new URL(oauth.location);
  assert.equal(googleUrl.origin, "https://accounts.google.com", `Unexpected OAuth redirect: ${googleUrl.href}`);
  assert.equal(googleUrl.searchParams.get("redirect_uri"), "https://www.windx.app/auth/google/callback");
  const flowCookie = oauth.cookie;
  assert.match(flowCookie, /__Host-windx_google=/); assert.match(flowCookie, /HttpOnly/); assert.match(flowCookie, /Secure/);
  const cancel = await fetch(`${base}/auth/google/callback?state=${googleUrl.searchParams.get("state")}&error=access_denied`, { headers: { Host: "www.windx.app", Cookie: flowCookie.split(";")[0] }, redirect: "manual" });
  assert.equal(cancel.status, 303); assert.equal(cancel.headers.get("location"), "https://www.windx.app/login?google=failed");
  const replay = await fetch(`${base}/auth/google/callback?state=${googleUrl.searchParams.get("state")}&error=access_denied`, { headers: { Host: "www.windx.app", Cookie: flowCookie.split(";")[0] }, redirect: "manual" });
  assert.equal(replay.headers.get("location"), "https://www.windx.app/login?google=failed");
  // Полный гостевой сценарий: никакой учётной записи до готового результата.
  const home = await get("/"), homeBody = await home.text();
  assert.equal(home.status, 200); assert.ok(homeBody.includes('name="brief"')); assert.ok(!homeBody.includes("PRIVATE_ACCOUNT_A"));
  const form = (fields: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(fields)) data.set(key, value); return data; };
  const stateFrom = (body: string) => body.split("\n").flatMap(line => { try { return [JSON.parse(line.slice(line.indexOf(":") + 1))]; } catch { return []; } }).find(value => value && typeof value === "object" && ("estimate" in value || "status" in value));
  const tokenFrom = (response: Response) => {
    const cookie = response.headers.getSetCookie().find((value) => value.startsWith("__Host-windx_session="));
    assert.ok(cookie, "Missing session cookie"); return cookie.split(";")[0].slice("__Host-windx_session=".length);
  };
  const brief = "A bicycle repair workshop in London. We repair bicycles, offer servicing, fix punctures and brakes. Create a disposable trial for testing account ownership.";
  const quoted = await post("createSiteAction", [{ clarify: false, brief: "" }, form({ brief })], "");
  const quote = stateFrom(quoted.body); assert.ok(quote?.estimate, quoted.body);
  const trialToken = tokenFrom(quoted.response);
  const created = await post("createSiteAction", [quote, form({ brief, decision: "confirm", estimateId: quote.estimate.id })], trialToken);
  const target = created.response.headers.get("x-action-redirect") ?? created.response.headers.get("location") ?? "";
  const trialId = target.match(/^\/sites\/([a-z0-9-]+)/)?.[1];
  assert.ok(trialId, `Trial creation failed: ${created.body}`);
  let trial = (await raw.getSite(trialId))!;
  assert.ok(trial.ownerId?.startsWith("guest-"));
  const trialVersion = (await raw.getVersion(trialId, 1))!;
  const stranger = await createSession(guestIdentity());
  assert.ok(!(await (await get("/sites", stranger)).text()).includes(`/sites/${trialId}`));
  assert.equal((await get(`/preview/${trialId}/1`, stranger)).status, 404);
  const trialPage = await (await get(`/sites/${trialId}`, trialToken)).text();
  assert.ok(trialPage.includes("Your trial site is ready")); assert.ok(!trialPage.includes('id="tab-code"'));
  await post("editSiteAction", [trialId, { status: "idle" }, form({ request: "Make the hero calmer" })], trialToken);
  assert.equal(await raw.getPendingEdit(trialId), null);
  await post("publishAction", [trialId], trialToken);
  assert.equal((await raw.getSite(trialId))?.published, undefined);
  await post("factsBulkAction", [trialId, trialVersion.doc.factsToConfirm.map((fact) => fact.fact), "confirmed"], trialToken);
  await post("publishAction", [trialId], trialToken);
  trial = (await raw.getSite(trialId))!;
  assert.ok(trial.published); const published = trial.published;
  await post("renameAction", [trialId, "GUEST_MUST_NOT_RENAME"], trialToken);
  await post("unpublishAction", [trialId], trialToken);
  assert.equal((await raw.getSite(trialId))?.name, trial.name); assert.deepEqual((await raw.getSite(trialId))?.published, published);
  const signup = await post("loginAction", ["", form({ email: "trial-member@example.test", password: "synthetic-trial-password-123", mode: "register", locale: "en", next: `/sites/${trialId}` })], trialToken);
  const memberToken = tokenFrom(signup.response);
  assert.notEqual(memberToken, trialToken);
  const claimed = (await raw.getSite(trialId))!;
  assert.ok(claimed.ownerId && !claimed.ownerId.startsWith("guest-")); assert.deepEqual(claimed.published, published);
  assert.equal((await get(`/preview/${trialId}/1`, trialToken)).status, 404);
  assert.equal((await get(`/preview/${trialId}/1`, memberToken)).status, 200);
  const editQuote = stateFrom((await post("editSiteAction", [trialId, { status: "idle" }, form({ request: "Make the hero calmer" })], memberToken)).body);
  assert.equal(editQuote?.status, "estimate"); assert.equal(await raw.getPendingEdit(trialId), null);
  await post("editSiteAction", [trialId, editQuote, form({ request: "Make the hero calmer", decision: "confirm", estimateId: editQuote.estimate.id })], memberToken);
  assert.ok(await raw.getPendingEdit(trialId));
  assert.equal((await raw.getSite("site-a"))?.ownerId, "account-a");
  assert.equal((await raw.getSite("legacy"))?.ownerId, undefined);
  console.log("PASS: anonymous creation and publication, guest isolation, edits blocked until signup, site/address preserved, old guest session revoked, member edit enabled");
  console.log("PASS: production HTTP isolation, private previews, public published version, direct foreign actions denied, own action succeeds");
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => server.once("exit", resolve));
  await rm(root, { recursive: true, force: true });
}
