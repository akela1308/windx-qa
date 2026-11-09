import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { FileSiteStore } from "../src/lib/storage/file-store";
import { createSession } from "../src/lib/auth/accounts";
import { guestIdentity } from "../src/lib/auth/guest";
import {
  emptyRequirementsInputs,
  type RequirementsCheckState,
} from "../src/lib/requirements/types";
import { requirementsState } from "../src/lib/requirements/state";
import type { Site, SiteVersion } from "../src/lib/storage/types";
const root = await mkdtemp(path.join(os.tmpdir(), "windx-requirements-http-"));
process.env.WINDX_DATA_DIR = root;
const port = 3201,
  base = `http://127.0.0.1:${port}`,
  raw = new FileSiteStore(root),
  now = new Date().toISOString();
const doc = JSON.parse(
  await readFile("docs/experiment-1c/outputs/bike/light.json", "utf8"),
);
doc.factsToConfirm = [];
const site: Site = {
  id: "req-one",
  ownerId: "owner",
  name: "PRIVATE_REQ_SITE",
  brief: "PRIVATE_REQ_BRIEF",
  facts: {},
  createdAt: now,
  updatedAt: now,
  currentVersion: 2,
  versionCount: 2,
  published: { slug: "req-one", version: 1, at: now },
};
const v = (n: number): SiteVersion => ({
  n,
  createdAt: now,
  action: "create",
  request: "private",
  reply: "private",
  doc: structuredClone(doc),
  demo: true,
  usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, estimated: false },
});
const old = v(1),
  draft = v(2);
draft.doc.sections.push({
  composition: "contact.form",
  id: "req-form",
  tone: "default",
  props: { title: "Ask", submitLabel: "Send" },
});
await raw.saveSite(site);
await raw.addVersion(site.id, old);
await raw.addVersion(site.id, draft);
const guest = guestIdentity();
await raw.saveSite({
  ...site,
  id: "guest-req",
  ownerId: guest.id,
  published: undefined,
  currentVersion: 1,
  versionCount: 1,
});
await raw.addVersion("guest-req", old);
const owner = await createSession({ id: "owner", email: "owner@example.test" }),
  foreign = await createSession({
    id: "foreign",
    email: "foreign@example.test",
  }),
  guestToken = await createSession(guest);
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    env: { ...process.env, AI_DEMO: "1", NODE_ENV: "production" },
    stdio: "pipe",
  },
);
let logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
type Response = {
  ok: boolean;
  stale?: boolean;
  limited?: boolean;
  state?: RequirementsCheckState;
  report?: { version: number; formSections: number[]; id: string };
};
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/login")).status === 200) break;
    } catch {}
    if (server.exitCode !== null) throw Error(logs);
    await new Promise((r) => setTimeout(r, 100));
  }
  const manifest = JSON.parse(
    await readFile(".next/server/server-reference-manifest.json", "utf8"),
  );
  const actions = Object.entries(manifest.node) as [
    string,
    { exportedName: string },
  ][];
  const { encodeReply } = createRequire(import.meta.url)(
    "next/dist/compiled/react-server-dom-turbopack/client.node",
  ) as { encodeReply: (args: unknown[]) => Promise<string | FormData> };
  async function call(
    name: string,
    args: unknown[],
    token = owner,
  ): Promise<Response> {
    const id = actions.find(([, a]) => a.exportedName === name)?.[0];
    assert.ok(id, name);
    const body = await encodeReply(args);
    const response = await fetch(base + "/sites/req-one", {
      method: "POST",
      headers: {
        "Next-Action": id,
        origin: base,
        ...(token ? { cookie: `__Host-windx_session=${token}` } : {}),
        ...(typeof body === "string"
          ? { "content-type": "text/plain;charset=UTF-8" }
          : {}),
      },
      body,
      redirect: "manual",
    });
    const text = await response.text();
    const values = text.split("\n").flatMap((line) => {
      try {
        return [JSON.parse(line.slice(line.indexOf(":") + 1))];
      } catch {
        return [];
      }
    });
    return values.find((v) => v && typeof v.ok === "boolean") as Response;
  }
  const input = {
    ...emptyRequirementsInputs(),
    country: "United Kingdom",
    market: "uk" as const,
    entity: "sole" as const,
    legalName: "PRIVATE_REQUIREMENTS_ANSWER",
    sales: "no" as const,
    tracking: "none" as const,
  };
  let state = await requirementsState(raw, site);
  for (const token of ["", foreign]) {
    assert.equal(
      (
        await call(
          "saveRequirementsInputsAction",
          [site.id, input, null],
          token,
        )
      ).ok,
      false,
    );
    assert.equal(
      (
        await call(
          "runRequirementsAction",
          [site.id, "draft", state.draft],
          token,
        )
      ).ok,
      false,
    );
  }
  assert.equal(await raw.getRequirementsProfile(site.id), null);
  const save = await call("saveRequirementsInputsAction", [
    site.id,
    input,
    null,
  ]);
  assert.equal(save.ok, true);
  state = save.state!;
  assert.ok(state.profile?.revision);
  assert.equal(
    (
      await call("saveRequirementsInputsAction", [
        site.id,
        { ...input, transfers: "x".repeat(601) },
        state.profile!.revision,
      ])
    ).ok,
    false,
  );
  assert.equal(
    (
      await call("saveRequirementsInputsAction", [
        site.id,
        { ...input, unexpected: true },
        state.profile!.revision,
      ])
    ).ok,
    false,
  );
  const conflict = await call("saveRequirementsInputsAction", [
    site.id,
    input,
    null,
  ]);
  assert.equal(conflict.ok, false);
  assert.equal(conflict.stale, true);
  assert.equal(conflict.state?.profile?.revision, state.profile!.revision);
  const before = JSON.stringify(await raw.getSite(site.id));
  const pub = await call("runRequirementsAction", [
    site.id,
    "published",
    state.published,
  ]);
  assert.equal(pub.ok, true);
  assert.equal(pub.report!.version, 1);
  assert.equal(pub.report!.formSections.length, 0);
  const saved = await call("runRequirementsAction", [
    site.id,
    "draft",
    state.draft,
  ]);
  assert.equal(saved.ok, true);
  assert.equal(saved.report!.version, 2);
  assert.equal(saved.report!.formSections.length, 1);
  assert.equal(JSON.stringify(await raw.getSite(site.id)), before);
  assert.equal((await raw.listVersions(site.id)).length, 2);
  assert.equal(await raw.getPendingEdit(site.id), null);
  assert.equal((await raw.listEnquiries(site.id)).length, 0);
  const staleFp = state.draft,
    revision = state.profile!.revision;
  const changed = await call("saveRequirementsInputsAction", [
    site.id,
    { ...input, tracking: "advertising" },
    revision,
  ]);
  assert.equal(changed.ok, true);
  state = changed.state!;
  assert.equal(
    (await call("runRequirementsAction", [site.id, "draft", staleFp])).stale,
    true,
  );
  assert.equal(
    (await call("runRequirementsAction", [site.id, "bad-target", state.draft]))
      .ok,
    false,
  );
  assert.equal(
    (await call("runRequirementsAction", ["../req-one", "draft", state.draft]))
      .ok,
    false,
  );
  for (const token of ["", foreign]) {
    const response = await fetch(base + "/sites/" + site.id, {
      headers: token ? { cookie: `__Host-windx_session=${token}` } : {},
    });
    const html = await response.text();
    assert.ok(
      !html.includes("PRIVATE_REQUIREMENTS_ANSWER") &&
        !html.includes("PRIVATE_REQ_SITE"),
    );
  }
  const own = await fetch(base + "/sites/" + site.id, {
    headers: { cookie: `__Host-windx_session=${owner}` },
  });
  assert.equal(own.status, 200);
  assert.ok((await own.text()).includes("PRIVATE_REQUIREMENTS_ANSWER"));
  let guestSite = (await raw.getSite("guest-req"))!,
    guestState = await requirementsState(raw, guestSite);
  assert.equal(
    (
      await call(
        "saveRequirementsInputsAction",
        ["guest-req", input, null],
        guestToken,
      )
    ).ok,
    true,
  );
  guestState = await requirementsState(raw, guestSite);
  assert.equal(
    (
      await call(
        "runRequirementsAction",
        ["guest-req", "draft", guestState.draft],
        guestToken,
      )
    ).ok,
    true,
  );
  guestSite = {
    ...guestSite,
    published: { slug: "guest-req", version: 1, at: now },
  };
  await raw.saveSite(guestSite);
  assert.equal(
    (
      await call(
        "saveRequirementsInputsAction",
        ["guest-req", input, guestState.profile!.revision],
        guestToken,
      )
    ).ok,
    false,
  );
  assert.equal(
    (
      await call(
        "runRequirementsAction",
        ["guest-req", "draft", guestState.draft],
        guestToken,
      )
    ).ok,
    false,
  );
  const reports = await raw.listRequirementsReports(site.id);
  assert.equal(reports.length, 2);
  assert.equal(reports[0].inputs.tracking, "none");
  assert.equal(
    (await raw.getRequirementsProfile(site.id))!.inputs.tracking,
    "advertising",
  );
  assert.ok(!logs.includes("OPENROUTER") && !logs.includes("ANTHROPIC"));
  console.log(
    "PASS: production actions, private owner answers/history, anonymous/foreign denial, guest pre/post-publication rules, saved vs published versions, bounded inputs, optimistic conflicts, stale-run rejection and no site/version/proposal/enquiry/model side effects",
  );
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => server.once("exit", resolve));
  await rm(root, { recursive: true, force: true });
}
