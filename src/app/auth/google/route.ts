import { cookies } from "next/headers";
import { currentUser } from "@/lib/auth/session";
import { authOrigin, googleEnabled, startGoogleFlow, GOOGLE_FLOW_COOKIE, GOOGLE_FLOW_OPTIONS } from "@/lib/auth/google";
import { allowAttempt } from "@/lib/auth/accounts";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get("host") !== new URL(authOrigin()).host) return Response.redirect(`${authOrigin()}${url.pathname}${url.search}`, 303);
  if (!googleEnabled()) return Response.redirect(`${authOrigin()}/login?google=unavailable`, 303);
  if (!allowAttempt("global")) return new Response("Please try again later", { status: 429, headers: { "Cache-Control": "no-store" } });
  const link = new URL(request.url).searchParams.get("link") === "1";
  const user = link ? await currentUser() : null;
  if (link && !user) return Response.redirect(`${authOrigin()}/login`, 303);
  const flow = await startGoogleFlow(user?.id);
  (await cookies()).set(GOOGLE_FLOW_COOKIE, flow.state, GOOGLE_FLOW_OPTIONS);
  return new Response(null, { status: 303, headers: { Location: flow.url, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
