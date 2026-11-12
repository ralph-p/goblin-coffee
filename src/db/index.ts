import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * The single DB entry point. When self-hosting, swap the Neon HTTP driver for
 * `drizzle-orm/node-postgres` here. Nothing else in the app needs to change.
 */
let instance: NeonHttpDatabase<typeof schema> | undefined;

export function db() {
  instance ??= drizzle(neon(env().DATABASE_URL), { schema, casing: "snake_case" });
  return instance;
}
