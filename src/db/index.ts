import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Drizzle client for the future Neon-backed Repo (DATA_DRIVER=neon).
 * Not used while the app runs on the in-memory repo.
 * When self-hosting, swap the Neon HTTP driver for `drizzle-orm/node-postgres`.
 */
let instance: NeonHttpDatabase<typeof schema> | undefined;

export function db() {
  const url = env().DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  instance ??= drizzle(neon(url), { schema, casing: "snake_case" });
  return instance;
}
