import { cookies } from "next/headers";
import { currentUser, signIn } from "@/lib/auth/session";
import { googleAccount } from "@/lib/auth/accounts";
import { authOrigin, consumeGoogleFlow, finishGoogleFlow, GOOGLE_FLOW_COOKIE } from "@/lib/auth/google";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const jar = await cookies(), expected = jar.get(GOOGLE_FLOW_COOKIE)?.value;
  jar.delete(GOOGLE_FLOW_COOKIE);
  let linking = false;
  let destination = "/login?google=failed";
  try {
    const state = params.get("state");
    if (!expected || state !== expected) throw new Error("Invalid state");
    const flow = await consumeGoogleFlow(state);
    linking = !!flow.linkUserId;
    if (params.has("error") || !params.get("code")) throw new Error("Google sign-in cancelled");
    if (flow.linkUserId && (await currentUser())?.id !== flow.linkUserId) throw new Error("Link session changed");
    const identity = await finishGoogleFlow(params.get("code")!, flow);
    const user = await googleAccount(identity.sub, identity.email, flow.linkUserId);
    await signIn(user);
    destination = linking ? "/account?google=linked" : "/sites";
  } catch {
    destination = linking ? "/account?google=failed" : "/login?google=failed";
  }
  return new Response(null, { status: 303, headers: { Location: `${authOrigin()}${destination}`, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
