import "server-only";
import { z } from "zod";

/**
 * Server environment, validated with zod on first use (not at import time),
 * so `next build` works without secrets.
 *
 * Each external service has a driver switch. The defaults are local mocks,
 * so the app runs with zero env vars. Credentials are required only when
 * the matching real driver is selected.
 */
const schema = z
  .object({
    APP_URL: z.url().default("http://localhost:3000"),
    CRON_SECRET: z.string().min(32).optional(),
    ADMIN_OPEN: z.enum(["true", "false"]).default("false"),

    DATA_DRIVER: z.enum(["memory", "neon"]).default("memory"),
    DATABASE_URL: z.url().optional(),

    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default("ca-central-1"),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_ENDPOINT: z.url().optional(),
    S3_PUBLIC_URL: z.url().optional(),

    EMAIL_DRIVER: z.enum(["dev", "resend"]).default("dev"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("Goblin Coffee <orders@goblincoffee.ca>"),
  })
  .superRefine((e, ctx) => {
    const need = (cond: boolean, keys: (keyof typeof e)[], why: string) => {
      if (!cond) return;
      for (const k of keys) {
        if (!e[k]) ctx.addIssue({ code: "custom", path: [k], message: `Required when ${why}` });
      }
    };
    need(e.DATA_DRIVER === "neon", ["DATABASE_URL"], "DATA_DRIVER=neon");
    need(
      e.STORAGE_DRIVER === "s3",
      ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
      "STORAGE_DRIVER=s3",
    );
    need(e.EMAIL_DRIVER === "resend", ["RESEND_API_KEY"], "EMAIL_DRIVER=resend");
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  cached ??= schema.parse(process.env);
  return cached;
}
