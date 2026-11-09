import { Resolver } from "node:dns/promises";
import https from "node:https";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
export function publicAddress(address: string) {
  try {
    const parsed = ipaddr.process(address);
    if (parsed.range() !== "unicast") return false;
    // Дополнительно исключаем документационные и переходные IPv6-сети.
    if (parsed.kind() === "ipv6")
      for (const cidr of [
        "2001:db8::/32",
        "2001::/32",
        "2001:2::/48",
        "2001:10::/28",
        "2001:20::/28",
        "2002::/16",
        "64:ff9b::/96",
        "64:ff9b:1::/48",
      ]) {
        const [net, bits] = ipaddr.parseCIDR(cidr);
        if (parsed.match(net, bits)) return false;
      }
    return !address.includes("%");
  } catch {
    return false;
  }
}
export async function verifyDomainTxt(
  host: string,
  value: string,
): Promise<"valid" | "missing" | "unavailable"> {
  const resolver = new Resolver({ timeout: 1500, tries: 1 });
  try {
    return (await resolver.resolveTxt(`_windx.${host}`)).some(
      (chunks) => chunks.join("") === value,
    )
      ? "valid"
      : "missing";
  } catch (error) {
    return ["ENOTFOUND", "ENODATA"].includes(
      (error as NodeJS.ErrnoException).code ?? "",
    )
      ? "missing"
      : "unavailable";
  }
}
export async function probeDomain(
  host: string,
  expected: string,
): Promise<"valid" | "failed" | "privateAddress"> {
  const resolver = new Resolver({ timeout: 1500, tries: 1 });
  const results = await Promise.allSettled([
    resolver.resolve4(host),
    resolver.resolve6(host),
  ]);
  const addresses = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  if (!addresses.length) return "failed";
  if (addresses.some((address) => !publicAddress(address)))
    return "privateAddress";
  const address = addresses.find((ip) => isIP(ip) === 4) ?? addresses[0];
  // IP закреплён после проверки. DNS rebinding не может отправить HTTPS-пробу
  // в локальную сеть. Сертификат проверяется для исходного имени, не для IP.
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: "valid" | "failed") => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(result);
      }
    };
    const req = https.request(
      {
        hostname: host,
        port: 443,
        family: isIP(address),
        servername: host,
        path: "/.well-known/windx-domain-check",
        method: "GET",
        rejectUnauthorized: true,
        agent: false,
        lookup: (_hostname, options, callback) =>
          options.all
            ? callback(null, [{ address, family: isIP(address) }])
            : callback(null, address, isIP(address)),
        headers: {
          Accept: "text/plain",
          "User-Agent": "WINDX-Domain-Check/1.0",
          "Cache-Control": "no-cache",
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.destroy();
          finish("failed");
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > 1024) {
            req.destroy();
            finish("failed");
          } else chunks.push(Buffer.from(chunk));
        });
        res.on("end", () =>
          finish(
            Buffer.concat(chunks).toString("utf8") === expected
              ? "valid"
              : "failed",
          ),
        );
        res.on("error", () => finish("failed"));
      },
    );
    const timer = setTimeout(() => {
      req.destroy();
      finish("failed");
    }, 5000);
    req.on("error", () => finish("failed"));
    req.end();
  });
}
