// Запускать на сервере с WINDX_DATA_DIR и WINDX_OWNER_EMAIL.
// Не назначаем владельца по одной лишь почте, приглашение подтверждает доступ.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";

const root = process.env.WINDX_DATA_DIR;
const email = process.env.WINDX_OWNER_EMAIL?.trim().toLowerCase();
if (!root || !email) throw new Error("Set WINDX_DATA_DIR and WINDX_OWNER_EMAIL");
const selected = process.argv.slice(2);
if (!selected.length || selected.some((id) => !/^[a-z0-9-]+$/.test(id))) throw new Error("Pass the explicit IDs of the owner's legacy sites");
const hash = (s) => createHash("sha256").update(s).digest("hex");
const invitePath = path.join(root, "auth", "invites", `${hash(email)}.json`);
const userPath = path.join(root, "auth", "users", `${hash(email)}.json`);
try { await readFile(userPath); throw new Error("Account already exists; do not overwrite credentials"); }
catch (e) { if (e.code !== "ENOENT") throw e; }
const id = randomUUID();
const token = randomBytes(32).toString("hex");
await mkdir(path.dirname(invitePath), { recursive: true, mode: 0o700 });
// wx запрещает случайно заменить ранее выданное приглашение.
await writeFile(invitePath, JSON.stringify({ id, tokenHash: hash(token), expires: Date.now() + 48 * 60 * 60_000 }), { flag: "wx", mode: 0o600 });
const backup = path.join(root, "backups", `ownership-${Date.now()}`);
await mkdir(backup, { recursive: true, mode: 0o700 });
let moved = 0;
for (const entry of selected) {
  const target = path.join(root, "sites", entry, "site.json");
  const raw = await readFile(target, "utf8");
  const site = JSON.parse(raw);
  if (site.ownerId) continue;
  await writeFile(path.join(backup, `${entry}.json`), raw, { flag: "wx", mode: 0o600 });
  await writeFile(`${target}.ownership-tmp`, JSON.stringify({ ...site, ownerId: id }, null, 1));
  await rename(`${target}.ownership-tmp`, target);
  moved++;
}
console.log(JSON.stringify({ email, moved, invitation: token }));
