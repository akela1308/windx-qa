import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { FileSiteStore } from "../src/lib/storage/file-store";
import { OwnedSiteStore } from "../src/lib/storage/owned-store";
import { authenticate, createSession, registerAccount, revokeSession, sessionIdentity, allowAttempt } from "../src/lib/auth/accounts";
import type { Site, SiteVersion, PendingEdit } from "../src/lib/storage/types";

const root = await mkdtemp(path.join(os.tmpdir(), "windx-auth-test-"));
process.env.WINDX_DATA_DIR = root;
process.env.WINDX_OWNER_EMAIL = "owner@example.test";
try {
  const raw = new FileSiteStore(root);
  const a = new OwnedSiteStore(raw, "owner-a"), b = new OwnedSiteStore(raw, "owner-b");
  const site: Site = { id: "site-a", name: "Private A", brief: "Private brief", createdAt: "now", updatedAt: "now", currentVersion: 1, versionCount: 1, facts: {} };
  const version = { n: 1, request: "private request", doc: { private: true } } as unknown as SiteVersion;
  const pending = { id: "pending-a", baseVersion: 1, version } as unknown as PendingEdit;
  await a.saveSite(site); await a.addVersion(site.id, version); await a.savePendingEdit(site.id, pending);
  await raw.saveSite({ ...site, id: "legacy" });
  assert.equal((await a.listSites()).length, 1);
  assert.deepEqual(await b.listSites(), []);
  for (const id of [site.id, "legacy"]) {
    assert.equal(await b.getSite(id), null);
    assert.equal(await b.getVersion(id, 1), null);
    assert.equal(await b.getPendingEdit(id), null);
    assert.deepEqual(await b.listVersions(id), []);
    await assert.rejects(b.saveSite({ ...site, id }));
    await assert.rejects(b.addVersion(id, version));
    await assert.rejects(b.savePendingEdit(id, pending));
    await assert.rejects(b.deletePendingEdit(id));
    await assert.rejects(b.deleteSite(id));
  }
  await assert.rejects(a.saveSite({ ...site, ownerId: "owner-b" }));
  assert.equal((await raw.getSite(site.id))?.name, "Private A");
  const user = await registerAccount(" Test@Example.test ", "test-password-long-123");
  assert.equal((await authenticate("test@example.test", "test-password-long-123"))?.id, user.id);
  assert.equal(await authenticate("test@example.test", "wrong"), null);
  assert.equal(await authenticate("unknown@example.test", "wrong"), null);
  await assert.rejects(registerAccount("test@example.test", "different-password-123"));
  await assert.rejects(registerAccount("owner@example.test", "test-password-long-123"));
  await assert.rejects(registerAccount("bad email", "test-password-long-123"));
  await assert.rejects(registerAccount("short@example.test", "short"));
  const token = await createSession(user);
  assert.equal((await sessionIdentity(token))?.id, user.id);
  assert.equal(await sessionIdentity("forged"), null);
  await revokeSession(token);
  assert.equal(await sessionIdentity(token), null);
  for (let n = 0; n < 10; n++) assert.ok(allowAttempt("rate-test"));
  assert.equal(allowAttempt("rate-test"), false);
  // Истёкшая сессия не восстанавливает доступ.
  const { createHash } = await import("node:crypto");
  const expired = await createSession(user);
  const digest = createHash("sha256").update(expired).digest("hex");
  await writeFile(path.join(root, "auth", "sessions", `${digest}.json`), JSON.stringify({ user, expires: 0 }));
  assert.equal(await sessionIdentity(expired), null);
  const invitation = JSON.parse(execFileSync(process.execPath, ["scripts/invite-owner.mjs", "legacy"], { env: process.env, encoding: "utf8" }));
  assert.equal(invitation.moved, 1);
  await assert.rejects(registerAccount("owner@example.test", "owner-test-password-123", "incorrect-code"));
  const owner = await registerAccount("owner@example.test", "owner-test-password-123", invitation.invitation);
  assert.equal((await raw.getSite("legacy"))?.ownerId, owner.id);
  assert.equal((await raw.getSite(site.id))?.ownerId, "owner-a");
  await assert.rejects(registerAccount("owner@example.test", "different-password-123", invitation.invitation));
  console.log("PASS: ownership across all store operations; legacy denial; login; reserved owner; session revocation/expiry; rate limit");
} finally { await rm(root, { recursive: true, force: true }); }
