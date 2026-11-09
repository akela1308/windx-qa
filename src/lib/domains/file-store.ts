import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  DomainConnectionSchema,
  DomainError,
  type DomainRepository,
  type DomainRegistry,
} from "./types";
const Schema = z.record(
  z.string().regex(/^[a-z0-9-]+$/),
  DomainConnectionSchema,
);
export class FileDomainRepository implements DomainRepository {
  constructor(private root: string) {}
  private get dir() {
    return path.join(this.root, "domains");
  }
  async read(): Promise<DomainRegistry> {
    try {
      return Schema.parse(
        JSON.parse(
          await readFile(path.join(this.dir, "connections.json"), "utf8"),
        ),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw error;
    }
  }
  async transaction<T>(
    run: (registry: DomainRegistry) => Promise<T>,
  ): Promise<T> {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    const lock = path.join(this.dir, "write.lock"),
      until = Date.now() + 5000;
    // Общая файловая блокировка работает и между разными серверными bundles.
    // После аварии её нельзя молча захватывать: нужен осмотр администратором.
    while (true) {
      try {
        await mkdir(lock, { mode: 0o700 });
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        if (Date.now() > until) throw new DomainError("busy");
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    try {
      await writeFile(
        path.join(lock, "owner.json"),
        JSON.stringify({ pid: process.pid, at: new Date().toISOString() }),
        { mode: 0o600, flag: "wx" },
      );
      const registry = await this.read(),
        result = await run(registry);
      const temp = path.join(this.dir, `${randomUUID()}.tmp`);
      await writeFile(temp, JSON.stringify(Schema.parse(registry)), {
        mode: 0o600,
        flag: "wx",
      });
      try {
        await rename(temp, path.join(this.dir, "connections.json"));
      } finally {
        await rm(temp, { force: true });
      }
      return result;
    } finally {
      await rm(lock, { recursive: true, force: true });
    }
  }
}
