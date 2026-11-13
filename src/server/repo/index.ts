import "server-only";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import { createMemoryRepo } from "./memory/memory-repo";
import { seed, type SeedData } from "./memory/seed";
import type { Repo } from "./types";

export type { Repo } from "./types";

export const DEV_DB_PATH = path.join(process.cwd(), ".data", "dev-db.json");

const g = globalThis as unknown as { __goblinRepo?: Repo };

function loadSnapshot(): SeedData | null {
  try {
    return JSON.parse(fs.readFileSync(DEV_DB_PATH, "utf8")) as SeedData;
  } catch {
    return null;
  }
}

/**
 * The app's data access entry point. Kept on globalThis so it survives
 * dev hot-reloads. Add a `drizzle` branch here when wiring up Neon.
 */
export function repo(): Repo {
  if (g.__goblinRepo) return g.__goblinRepo;
  const driver = env().DATA_DRIVER;
  if (driver !== "memory") {
    throw new Error(`DATA_DRIVER=${driver} is not implemented yet. Use "memory".`);
  }
  g.__goblinRepo = createMemoryRepo({
    data: loadSnapshot() ?? seed(),
    persistPath: DEV_DB_PATH,
  });
  return g.__goblinRepo;
}
