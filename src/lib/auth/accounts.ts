import { randomBytes, randomUUID, scrypt as derive, timingSafeEqual } from "node:crypto";
import { writeFile, unlink, rename } from "node:fs/promises";
import { authFile as file, digest as hash, readJson as read, insertJson as insert, serialAccount, sessionGeneration } from "./account-store";
export { dataRoot } from "./account-store";

const scrypt = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
export type Account = { id: string; email: string; salt?: string; passwordHash?: string; googleSub?: string; emailVerifiedAt?: string };
export type Identity = Pick<Account, "id" | "email"> & { guest?: true; sessionVersion?: number };
export const normalizeEmail = (s: string) => s.trim().toLowerCase();
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
// Резерв владельца существующих сайтов до серверного приглашения.
const LEGACY_OWNER_EMAIL_HASH = "0495c775291ec1acbd8b1250c30199367ffdb9979536b0abbe4035317a0dcd56";

export async function passwordFields(password: string) {
  if (password.length < 8 || password.length > 128) throw new Error("Invalid password");
  const salt = randomBytes(16).toString("hex");
  return { salt, passwordHash: (await scrypt(password, salt)).toString("hex") };
}
async function identity(user: Account): Promise<Identity> {
  return { id: user.id, email: user.email, sessionVersion: await sessionGeneration(user.id) };
}

// Ограничитель одного процесса (кабинет работает в одной реплике).
// Лимит не заменяет внешнюю защиту от распределённых атак.
const attempts = new Map<string, { n: number; until: number }>();
export function allowAttempt(key: string, max = key === "global" ? 200 : 10): boolean {
  const now = Date.now();
  for (const [k, v] of attempts) if (v.until <= now) attempts.delete(k);
  if (!attempts.has(key) && attempts.size >= 2000) return false;
  const v = attempts.get(key) ?? { n: 0, until: now + 15 * 60_000 };
  attempts.set(key, v);
  return ++v.n <= max;
}

export async function registerAccount(email: string, password: string, invitation = ""): Promise<Identity> {
  email = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 8 || password.length > 128) throw new Error("Invalid credentials");
  return serialAccount(email, async () => {
  // Адрес владельца резервируется до выдачи персонального приглашения.
  const invite = await read<{ id: string; tokenHash: string; expires: number }>(file("invites", email));
  const reserved = hash(email) === LEGACY_OWNER_EMAIL_HASH || email === normalizeEmail(process.env.WINDX_OWNER_EMAIL ?? "");
  if (invite ? invite.expires <= Date.now() || !timingSafeEqual(Buffer.from(hash(invitation), "hex"), Buffer.from(invite.tokenHash, "hex")) : reserved) throw new Error("Reserved account");
  const salt = randomBytes(16).toString("hex");
  const passwordHash = (await scrypt(password, salt)).toString("hex");
  const user: Account = { id: invite?.id ?? randomUUID(), email, salt, passwordHash };
  await insert(file("users", email), user);
  return identity(user);
  });
}

export async function authenticate(email: string, password: string): Promise<Identity | null> {
  if (password.length > 128 || email.length > 254) return null;
  email = normalizeEmail(email);
  return serialAccount(email, async () => {
    const user = await read<Account>(file("users", email));
    const candidate = await scrypt(password, user?.salt ?? "00000000000000000000000000000000");
    return user?.passwordHash && timingSafeEqual(candidate, Buffer.from(user.passwordHash, "hex")) ? identity(user) : null;
  });
}

export async function accountSummary(user: Identity) {
  const account = await read<Account>(file("users", user.email));
  if (account?.id !== user.id) throw new Error("Account not found");
  return { email: account.email, googleLinked: !!account.googleSub, verified: !!account.emailVerifiedAt, hasPassword: !!account.passwordHash };
}

// Только для уже проверенных на сервере подписанных данных Google.
// Совпадение почты парольного аккаунта не разрешает автоматическую привязку.
export async function googleAccount(sub: string, email: string, linkUserId?: string): Promise<Identity> {
  email = normalizeEmail(email);
  return serialAccount(email, async () => {
  const mapping = await read<{ email: string }>(file("google", sub));
  if (mapping) {
    if (normalizeEmail(mapping.email) !== email) throw new Error("Google email change requires review");
    const linked = await read<Account>(file("users", mapping.email));
    if (!linked || linked.googleSub !== sub || (linkUserId && linked.id !== linkUserId)) throw new Error("Google account mismatch");
    if (!linked.emailVerifiedAt) {
      linked.emailVerifiedAt = new Date().toISOString();
      const target = file("users", linked.email), temp = `${target}.${randomUUID()}.tmp`;
      await writeFile(temp, JSON.stringify(linked), { mode: 0o600 }); await rename(temp, target);
    }
    return identity(linked);
  }
  const existing = await read<Account>(file("users", email));
  if (linkUserId && existing?.id !== linkUserId) throw new Error("Google email differs from account email");
  if (existing && existing.googleSub !== sub && existing.id !== linkUserId) throw new Error("Sign in with password before linking Google");
  if (existing?.googleSub && existing.googleSub !== sub) throw new Error("Google account mismatch");
  const invite = await read<{ id: string; expires: number }>(file("invites", email));
  if (!existing && (hash(email) === LEGACY_OWNER_EMAIL_HASH || email === normalizeEmail(process.env.WINDX_OWNER_EMAIL ?? "")) && (!invite || invite.expires <= Date.now())) throw new Error("Owner setup pending");
  const user: Account = { ...(existing ?? { id: invite?.id ?? randomUUID(), email }), googleSub: sub, emailVerifiedAt: existing?.emailVerifiedAt ?? new Date().toISOString() };
  if (existing) {
    const target = file("users", email), temp = `${target}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(user), { mode: 0o600 }); await rename(temp, target);
  } else await insert(file("users", email), user);
  await insert(file("google", sub), { email });
  return identity(user);
  });
}

export async function createSession(user: Identity, seconds = SESSION_SECONDS): Promise<string> {
  const version = await sessionGeneration(user.id);
  if (user.sessionVersion !== undefined && user.sessionVersion !== version) throw new Error("Credentials changed");
  const token = randomBytes(32).toString("hex");
  await insert(file("sessions", token), { user, version, expires: Date.now() + seconds * 1000 });
  return token;
}
export async function sessionIdentity(token: string): Promise<Identity | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await read<{ user: Identity; expires: number; version?: number }>(file("sessions", token));
  if (!session || session.expires <= Date.now()) return null;
  const version = await sessionGeneration(session.user.id);
  return (session.version ?? 0) === version ? { ...session.user, sessionVersion: version } : null;
}
export async function revokeSession(token: string) {
  if (/^[a-f0-9]{64}$/.test(token)) await unlink(file("sessions", token)).catch((e) => { if (e.code !== "ENOENT") throw e; });
}
