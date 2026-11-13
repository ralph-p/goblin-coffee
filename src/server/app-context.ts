import "server-only";
import { env } from "@/lib/env";
import { devMailer, resendMailer } from "./adapters/mailer";
import type { Ctx } from "./context";
import { repo } from "./repo";

/** Ctx wired to the configured drivers. Call from pages and server actions. */
export function appCtx(): Ctx {
  const e = env();
  const r = repo();
  return {
    repo: r,
    mailer: e.EMAIL_DRIVER === "resend" ? resendMailer(e.RESEND_API_KEY!, e.EMAIL_FROM) : devMailer(r),
    now: () => new Date(),
    appUrl: e.APP_URL,
  };
}

/**
 * Placeholder for Better Auth. Admin is open in dev; in production the proxy
 * blocks /admin unless ADMIN_OPEN=true. Replace with a real session check.
 */
export async function requireAdmin() {
  if (process.env.NODE_ENV === "production" && env().ADMIN_OPEN !== "true") {
    throw new Error("Unauthorized");
  }
}
