import { domainToASCII } from "node:url";
import { isIP } from "node:net";
import { parse } from "tldts";
import { DomainError } from "./types";
export function normalizedDomain(input: string) {
  if (typeof input !== "string" || input.length > 400)
    throw new DomainError("invalid");
  const raw = input.trim().replace(/\.$/, "");
  if (!raw || /[\s/@:#?%*\\\[\]]/.test(raw)) throw new DomainError("invalid");
  const host = domainToASCII(raw).toLowerCase();
  if (
    !host ||
    host.length > 253 ||
    isIP(host) ||
    host
      .split(".")
      .some(
        (p) =>
          !p || p.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(p),
      )
  )
    throw new DomainError("invalid");
  const parsed = parse(host, {
    allowPrivateDomains: true,
    detectSpecialUse: true,
  });
  if (
    !parsed.domain ||
    parsed.isSpecialUse ||
    (!parsed.isIcann && !parsed.isPrivate)
  )
    throw new DomainError("invalid");
  const roots = [
    process.env.WINDX_SITES_DOMAIN ?? "windx.app",
    "localhost",
    "railway.app",
    "railway.internal",
  ];
  try {
    roots.push(
      new URL(process.env.WINDX_AUTH_ORIGIN ?? "https://www.windx.app")
        .hostname,
    );
  } catch {}
  if (roots.some((root) => host === root || host.endsWith(`.${root}`)))
    throw new DomainError("invalid");
  return { host, apex: parsed.domain === host, zone: parsed.domain };
}
// Нормализация Host без доверия Forwarded / X-Forwarded-Host.
export function requestHostname(value: string) {
  if (value.length > 300 || /[\s/@?#%\\]/.test(value)) return null;
  try {
    const url = new URL(`http://${value}`);
    if (url.username || url.password || url.pathname !== "/") return null;
    return url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }
}
export function cabinetHost(host: string) {
  const root = (process.env.WINDX_SITES_DOMAIN ?? "windx.app").toLowerCase();
  const allowed = new Set([
    root,
    `www.${root}`,
    "localhost",
    "127.0.0.1",
    "[::1]",
    "healthcheck.railway.app",
    process.env.RAILWAY_PUBLIC_DOMAIN ?? "",
  ]);
  try {
    allowed.add(
      new URL(process.env.WINDX_AUTH_ORIGIN ?? "https://www.windx.app")
        .hostname,
    );
  } catch {}
  return allowed.has(host);
}
