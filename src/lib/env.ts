import "server-only";
import { z } from "zod";

/**
 * Server environment, validated with zod on first use (not at import time),
 * so `next build` works without secrets and missing vars fail loudly at the
 * point they're needed.
 */
const schema = z.object({
  DATABASE_URL: z.url(),

  APP_URL: z.url().default("http://localhost:3000"),
  CRON_SECRET: z.string().min(32),

  // S3 or any S3-compatible store (MinIO / R2 when self-hosting).
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().default("ca-central-1"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_ENDPOINT: z.url().optional(),
  S3_PUBLIC_URL: z.url().optional(),

  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().default("Goblin Coffee <orders@goblincoffee.ca>"),

  ETRANSFER_EMAIL: z.email(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  cached ??= schema.parse(process.env);
  return cached;
}
