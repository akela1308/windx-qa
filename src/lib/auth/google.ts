import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { OAuth2Client, CodeChallengeMethod, type TokenPayload } from "google-auth-library";
import { dataRoot } from "./accounts";

export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const GOOGLE_FLOW_COOKIE = process.env.NODE_ENV === "production" ? "__Host-windx_google" : "windx_google";
export const GOOGLE_FLOW_OPTIONS = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
type Flow = { verifier: string; nonce: string; expires: number; linkUserId?: string };
function flowPath(state: string) { return path.join(dataRoot(), "auth", "oauth", `${createHash("sha256").update(state).digest("hex")}.json`); }
export function authOrigin() {
  const value = process.env.WINDX_AUTH_ORIGIN ?? (process.env.NODE_ENV === "production" ? "https://www.windx.app" : "http://localhost:3185");
  const url = new URL(value);
  const localMailTest = process.env.WINDX_MAIL_TEST === "1" && process.env.WINDX_MAIL_PROVIDER === "file" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.origin !== value || !["http:", "https:"].includes(url.protocol) || (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !localMailTest)) throw new Error("Invalid auth origin");
  return value;
}
function client() {
  if (!googleEnabled()) throw new Error("Google sign-in unavailable");
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${authOrigin()}/auth/google/callback`);
}
export async function startGoogleFlow(linkUserId?: string) {
  const oauth = client();
  const { codeVerifier, codeChallenge } = await oauth.generateCodeVerifierAsync();
  const state = randomBytes(32).toString("hex"), nonce = randomBytes(32).toString("hex");
  const file = flowPath(state);
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, JSON.stringify({ verifier: codeVerifier, nonce, expires: Date.now() + 600_000, linkUserId } satisfies Flow), { flag: "wx", mode: 0o600 });
  return { state, url: oauth.generateAuthUrl({ scope: ["openid", "email"], state, nonce, prompt: "select_account", code_challenge: codeChallenge, code_challenge_method: CodeChallengeMethod.S256 }) };
}
export async function consumeGoogleFlow(state: string): Promise<Flow> {
  if (!/^[a-f0-9]{64}$/.test(state)) throw new Error("Invalid state");
  const file = flowPath(state), consumed = `${file}.consumed`;
  await rename(file, consumed); // только один callback может забрать состояние
  try {
    const flow: Flow = JSON.parse(await readFile(consumed, "utf8"));
    if (flow.expires <= Date.now()) throw new Error("Expired state");
    return flow;
  } finally { await unlink(consumed); }
}
export function checkedGoogleClaims(payload: TokenPayload | undefined, nonce: string) {
  if (!payload?.sub || !payload.email || payload.email_verified !== true || payload.nonce !== nonce || !["accounts.google.com", "https://accounts.google.com"].includes(payload.iss) || payload.aud !== process.env.GOOGLE_CLIENT_ID || !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) throw new Error("Invalid Google identity");
  return { sub: payload.sub, email: payload.email };
}
export async function finishGoogleFlow(code: string, flow: Flow) {
  const oauth = client();
  const { tokens } = await oauth.getToken({ code, codeVerifier: flow.verifier });
  if (!tokens.id_token) throw new Error("Missing Google ID token");
  const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
  // Библиотека Google проверяет подпись, issuer, audience и срок. Nonce связывает ответ с начатым входом.
  return checkedGoogleClaims(ticket.getPayload(), flow.nonce);
}
