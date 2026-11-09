import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, revokeSession, SESSION_SECONDS, sessionIdentity, type Identity } from "./accounts";
import { dataRoot } from "./accounts";
import { claimGuestSites, guestIdentity, GUEST_SECONDS } from "./guest";
import { FileSiteStore } from "@/lib/storage/file-store";

const COOKIE = process.env.NODE_ENV === "production" ? "__Host-windx_session" : "windx_session";
export async function currentIdentity() {
  return sessionIdentity((await cookies()).get(COOKIE)?.value ?? "");
}
export async function currentUser() {
  const identity = await currentIdentity();
  return identity?.guest ? null : identity;
}
export async function ensureIdentity(prepareGuest?: (guest: Identity) => Promise<void>) {
  const existing = await currentIdentity();
  const guest = existing ?? guestIdentity();
  if (guest.guest && prepareGuest) await prepareGuest(guest);
  if (existing) return existing;
  (await cookies()).set(COOKIE, await createSession(guest, GUEST_SECONDS), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: GUEST_SECONDS });
  return guest;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
export async function signIn(user: Identity) {
  const jar = await cookies();
  const previous = await currentIdentity();
  if (previous?.guest) await claimGuestSites(new FileSiteStore(dataRoot()), previous, user);
  await revokeSession(jar.get(COOKIE)?.value ?? "");
  jar.set(COOKIE, await createSession(user), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
}
export async function signOut() {
  const jar = await cookies();
  await revokeSession(jar.get(COOKIE)?.value ?? "");
  jar.delete(COOKIE);
}
