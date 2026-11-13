import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { appCtx } from "@/server/app-context";
import { JOBS, type JobName } from "@/server/services/jobs";

/**
 * Scheduled jobs are plain HTTP endpoints, so any scheduler can call them:
 * a Netlify scheduled function today, system cron or a container when self-hosted.
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/payment-reminders
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/cancel-unpaid
 */
function authorized(req: Request, secret: string) {
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(req: Request, ctx: RouteContext<"/api/cron/[job]">) {
  const secret = env().CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET is not configured", { status: 503 });
  if (!authorized(req, secret)) return new Response("Unauthorized", { status: 401 });

  const { job } = await ctx.params;
  if (!(job in JOBS)) return new Response("Unknown job", { status: 404 });

  const result = await JOBS[job as JobName](appCtx());
  return Response.json({ job, result });
}
