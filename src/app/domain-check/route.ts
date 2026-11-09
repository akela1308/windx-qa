import { publicDomain } from "@/lib/domains/public";
import { domainChallenge } from "@/lib/domains/service";
import { requestHostname } from "@/lib/domains/hostname";
export async function GET(request: Request) {
  const host = requestHostname(
      request.headers.get("x-windx-request-host") ?? "",
    ),
    marker = request.headers.get("x-windx-custom-site");
  const result = host && marker ? await publicDomain(host) : null;
  const valid = result?.binding?.site.id === marker;
  return new Response(
    valid ? domainChallenge(result!.binding!.connection) : "Not found",
    {
      status: valid ? 200 : result?.unavailable ? 503 : 404,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
