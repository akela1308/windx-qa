import { randomBytes } from "node:crypto";
import { rename, unlink, readdir } from "node:fs/promises";
import path from "node:path";
import { authFile, dataRoot, digest, readJson, insertJson, replaceJson, serialAccount, sessionGeneration, revokeUserSessions } from "./account-store";
import { normalizeEmail, passwordFields, type Account, type Identity } from "./accounts";
export class SecurityLinkError extends Error { constructor() { super("Invalid link"); } }
export type SecurityPurpose = "reset" | "verify";
type TokenRecord = { purpose: SecurityPurpose; email: string; id: string; version: number; expires: number };
export const TOKEN_SECONDS = { reset: 30 * 60, verify: 24 * 60 * 60 };
const tokenPath = (token: string) => authFile("security-tokens", token);
let cleanedAt = 0;
async function cleanupTokens() {
  if (Date.now() - cleanedAt < 300_000) return;
  cleanedAt = Date.now();
  const dir = path.join(dataRoot(), "auth", "security-tokens");
  const files = await readdir(dir).catch(() => []);
  for (const name of files.slice(0, 200)) {
    if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
    const file = path.join(dir, name), value = await readJson<TokenRecord>(file);
    if (value && value.expires <= Date.now()) await unlink(file).catch(() => {});
  }
}
export async function issueSecurityToken(email: string, purpose: SecurityPurpose, expectedUser?: Identity) {
  email = normalizeEmail(email);
  await cleanupTokens();
  return serialAccount(email, async () => {
    const account = await readJson<Account>(authFile("users", email));
    if (!account || expectedUser && (expectedUser.id !== account.id || expectedUser.guest)) return null;
    if (purpose === "verify" && account.emailVerifiedAt) return null;
    const version = await sessionGeneration(account.id);
    if (expectedUser?.sessionVersion !== undefined && expectedUser.sessionVersion !== version) return null;
    const token = randomBytes(32).toString("hex");
    await insertJson(tokenPath(token), { purpose, email, id: account.id, version, expires: Date.now() + TOKEN_SECONDS[purpose] * 1000 } satisfies TokenRecord);
    return token;
  });
}
export async function verificationStatus(token: string, user: Identity): Promise<"valid" | "invalid" | "wrongAccount"> {
  if (!/^[a-f0-9]{64}$/.test(token) || user.guest) return "invalid";
  const record = await readJson<TokenRecord>(tokenPath(token));
  if (!record || record.purpose !== "verify" || record.expires <= Date.now()) return "invalid";
  // Не раскрываем адрес получателя и не расходуем ссылку в чужой сессии.
  if (record.id !== user.id || record.email !== user.email) return "wrongAccount";
  return "valid";
}
export async function cancelSecurityToken(token: string) {
  if (/^[a-f0-9]{64}$/.test(token)) await unlink(tokenPath(token)).catch((e) => { if (e.code !== "ENOENT") throw e; });
}
export async function consumeSecurityToken(token: string, purpose: SecurityPurpose, password?: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new SecurityLinkError();
  // Неверный новый пароль не сжигает ссылку. Получение страницы никогда не потребляет токен.
  if (purpose === "reset" && (!password || password.length < 8 || password.length > 128)) throw new Error("Invalid password");
  const file = tokenPath(token), consumed = `${file}.used`;
  try { await rename(file, consumed); } // только один параллельный POST забирает токен
  catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") throw new SecurityLinkError(); throw e; }
  try {
    const record = await readJson<TokenRecord>(consumed);
    if (!record || record.purpose !== purpose || record.expires <= Date.now()) throw new SecurityLinkError();
    return await serialAccount(record.email, async () => {
      const target = authFile("users", record.email), account = await readJson<Account>(target);
      if (!account || account.id !== record.id || await sessionGeneration(account.id) !== record.version) throw new SecurityLinkError();
      if (purpose === "verify" && account.emailVerifiedAt) throw new SecurityLinkError();
      const credentials = purpose === "reset" ? await passwordFields(password!) : null;
      // Отзываем сессии ДО замены пароля: даже сбой записи не оставит старые сессии активными.
      if (purpose === "reset") await revokeUserSessions(account.id);
      await replaceJson(target, { ...account, ...credentials, emailVerifiedAt: account.emailVerifiedAt ?? new Date().toISOString() });
      return { id: account.id, email: account.email };
    });
  } finally { await unlink(consumed).catch(() => {}); }
}
// Постоянные лимиты переживают перезапуск. Имена ключей содержат только хеши.
export async function allowSecurityMail(email: string, actor: string) {
  const now = Date.now(), hour = Math.floor(now / 3_600_000);
  return serialAccount("mail-rate", async () => {
    const keys: [string, number][] = [["global", 60], [`actor:${digest(actor)}`, 10], [`email:${digest(normalizeEmail(email))}`, 3]];
    const records = await Promise.all(keys.map(async ([key]) => ({ file: authFile("mail-limits", key), record: await readJson<{ hour: number; count: number; last: number }>(authFile("mail-limits", key)) })));
    if (records.some(({ record }, i) => record?.hour === hour && (record.count >= keys[i][1] || i === 2 && now - record.last < 60_000))) return false;
    for (const { file, record } of records) await replaceJson(file, { hour, count: (record?.hour === hour ? record.count : 0) + 1, last: now });
    return true;
  });
}
