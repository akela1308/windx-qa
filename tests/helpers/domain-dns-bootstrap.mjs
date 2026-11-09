// Только явный preload тестового дочернего процесса. Production не импортирует этот файл.
import { Resolver } from "node:dns/promises";
import { readFile } from "node:fs/promises";
const file = process.env.WINDX_TEST_DNS_FIXTURE;
if (!file) throw Error("Missing isolated DNS fixture");
Resolver.prototype.resolveTxt = async function (host) {
  const data = JSON.parse(await readFile(file, "utf8"));
  if (data[host] === "unavailable")
    throw Object.assign(Error("temporary DNS failure"), { code: "ETIMEOUT" });
  const value = data[host];
  if (!value) throw Object.assign(Error("no fixture TXT"), { code: "ENODATA" });
  return [[value.slice(0, 20), value.slice(20)]];
};
