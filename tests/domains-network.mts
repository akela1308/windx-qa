import assert from "node:assert/strict";
import https from "node:https";
import { Resolver } from "node:dns/promises";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { probeDomain, verifyDomainTxt } from "../src/lib/domains/network";
const original = {
  four: Resolver.prototype.resolve4,
  six: Resolver.prototype.resolve6,
  txt: Resolver.prototype.resolveTxt,
  request: https.request,
};
let mode = "valid",
  requests = 0;
try {
  Resolver.prototype.resolveTxt = async () => [
    ["windx-veri", "fication=proof"],
  ];
  assert.equal(
    await verifyDomainTxt("www.example.co.uk", "windx-verification=proof"),
    "valid",
  );
  assert.equal(await verifyDomainTxt("www.example.co.uk", "wrong"), "missing");
  Resolver.prototype.resolveTxt = async () => {
    throw Object.assign(Error("DNS"), { code: "ETIMEOUT" });
  };
  assert.equal(
    await verifyDomainTxt("www.example.co.uk", "proof"),
    "unavailable",
  );
  Resolver.prototype.resolve4 = (async () =>
    mode === "private"
      ? ["1.1.1.1", "127.0.0.1"]
      : ["1.1.1.1"]) as unknown as typeof original.four;
  Resolver.prototype.resolve6 = (async () => [
    "2606:4700:4700::1111",
  ]) as unknown as typeof original.six;
  https.request = ((
    options: Record<string, unknown>,
    callback: (response: PassThrough & { statusCode: number }) => void,
  ) => {
    requests++;
    assert.equal(options.hostname, "www.example.co.uk");
    assert.equal(options.servername, "www.example.co.uk");
    assert.equal(options.port, 443);
    assert.equal(options.family, 4);
    assert.equal(options.rejectUnauthorized, true);
    assert.equal(options.path, "/.well-known/windx-domain-check");
    assert.equal(options.agent, false);
    const lookup = options.lookup as Function;
    lookup(
      "ignored",
      { all: false },
      (error: unknown, address: unknown, family: unknown) => {
        assert.equal(error, null);
        assert.equal(address, "1.1.1.1");
        assert.equal(family, 4);
      },
    );
    lookup("ignored", { all: true }, (error: unknown, addresses: unknown) => {
      assert.equal(error, null);
      assert.deepEqual(addresses, [{ address: "1.1.1.1", family: 4 }]);
    });
    const req = new EventEmitter() as EventEmitter & {
      end: () => void;
      destroy: () => void;
    };
    req.destroy = () => {};
    req.end = () =>
      queueMicrotask(() => {
        if (mode === "tls-error") {
          req.emit("error", Error("certificate mismatch"));
          return;
        }
        const response = Object.assign(new PassThrough(), {
          statusCode: mode === "redirect" ? 302 : 200,
        });
        callback(response);
        if (mode !== "redirect")
          response.end(
            mode === "large"
              ? "x".repeat(1025)
              : mode === "wrong"
                ? "wrong challenge"
                : "expected",
          );
      });
    return req;
  }) as unknown as typeof https.request;
  assert.equal(await probeDomain("www.example.co.uk", "expected"), "valid");
  for (mode of ["tls-error", "redirect", "large", "wrong"])
    assert.equal(
      await probeDomain("www.example.co.uk", "expected"),
      "failed",
      mode,
    );
  mode = "private";
  const before = requests;
  assert.equal(
    await probeDomain("www.example.co.uk", "expected"),
    "privateAddress",
  );
  assert.equal(requests, before, "Mixed DNS cannot issue any HTTPS request");
  console.log(
    "PASS domain network: split TXT, DNS outage, pinned IP lookup (single/all), original SNI and certificate validation, fixed path/port, redirects, wrong challenge, oversized response, TLS error and mixed private/public DNS rejection; all network calls mocked",
  );
} finally {
  Resolver.prototype.resolve4 = original.four;
  Resolver.prototype.resolve6 = original.six;
  Resolver.prototype.resolveTxt = original.txt;
  https.request = original.request;
}
