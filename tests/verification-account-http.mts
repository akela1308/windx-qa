import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import { registerAccount, createSession, sessionIdentity, accountSummary } from '../src/lib/auth/accounts';
import { issueSecurityToken } from '../src/lib/auth/security-tokens';
const root = await mkdtemp(path.join(os.tmpdir(), 'windx-verification-http-'));
process.env.WINDX_DATA_DIR = root;
const base = 'http://127.0.0.1:3226';
const owner = await registerAccount('owner@example.test', 'synthetic-pass-123');
const other = await registerAccount('other@example.test', 'synthetic-pass-456');
const ownerSession = await createSession(owner), otherSession = await createSession(other);
const proof = await issueSecurityToken(owner.email, 'verify', owner);
assert.ok(proof);
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3226'], {
 env: { ...process.env, NODE_ENV: 'production', AI_DEMO: '1', WINDX_AUTH_ORIGIN: base }, stdio: 'pipe',
});
let logs = ''; server.stdout.on('data', d => logs += d); server.stderr.on('data', d => logs += d);
try {
 for (let n = 0; n < 100; n++) {
  try { if ((await fetch(base + '/verify-email')).ok) break; } catch {}
  if (server.exitCode !== null) throw Error('Test server exited');
  await new Promise(r => setTimeout(r, 100));
 }
 const manifest = JSON.parse(await readFile('.next/server/server-reference-manifest.json', 'utf8'));
 const actions = Object.entries(manifest.node) as [string, { exportedName: string }][];
 const { encodeReply } = createRequire(import.meta.url)('next/dist/compiled/react-server-dom-turbopack/client.node');
 async function action(name: string, session: string, token = proof!) {
  const id = actions.find(([, a]) => a.exportedName === name)?.[0]; assert.ok(id);
  const form = new FormData(); form.set('token', token);
  const body = await encodeReply(['idle', form]);
  const response = await fetch(base + '/verify-email', { method: 'POST', redirect: 'manual', headers: {
   origin: base, 'Next-Action': id, ...(session ? { cookie: `__Host-windx_session=${session}` } : {}),
   ...(typeof body === 'string' ? { 'content-type': 'text/plain;charset=UTF-8' } : {}),
  }, body });
  const text = await response.text();
  return { response, result: [...text.matchAll(/(?:^|\n)[a-f0-9]+:"(wrongAccount|signIn|done|invalid)"/g)].at(-1)?.[1] };
 }
 assert.equal((await action('verifyEmailAction', '')).result, 'signIn');
 assert.equal((await action('verifyEmailAction', otherSession)).result, 'wrongAccount');
 assert.equal((await accountSummary(owner)).verified, false);
 assert.equal((await accountSummary(other)).verified, false);
 assert.equal((await action('verifyEmailAction', otherSession, 'invalid-token')).result, 'invalid');
 const switched = await action('switchVerificationAccountAction', otherSession);
 assert.equal(switched.result, 'signIn');
 assert.match(switched.response.headers.get('set-cookie') ?? '', /__Host-windx_session=/);
 assert.equal(await sessionIdentity(otherSession), null);
 assert.ok(await sessionIdentity(ownerSession));
 assert.equal((await action('verifyEmailAction', ownerSession)).result, 'done');
 assert.equal((await accountSummary(owner)).verified, true);
 assert.equal((await action('verifyEmailAction', ownerSession)).result, 'invalid');
 console.log('PASS: wrong-account explanation without consuming proof; invalid links stay invalid; explicit switch revokes only current session; original proof succeeds for its owner, then cannot be reused. Isolated data, no browser or real email.');
} finally {
 server.kill('SIGTERM'); if (server.exitCode === null) await new Promise<void>(r => server.once('exit', () => r()));
 await rm(root, { recursive: true, force: true });
}
