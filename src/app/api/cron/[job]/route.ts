import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Scheduled jobs are plain HTTP endpoints, so any scheduler can call them:
 * a Netlify scheduled function today, system cron or a container when self-hosted.
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/payment-reminders
 */
const jobs: Record<string, () => Promise<unknown>> = {
  // Phase 2: "payment-reminders", "cancel-unpaid"
  // Phase 7: "subscription-renewals"
  ping: async () => ({ ok: true }),
};

function authorized(req: Request) {
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env().CRON_SECRET}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(req: Request, ctx: RouteContext<"/api/cron/[job]">) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });

  const { job } = await ctx.params;
  const run = jobs[job];
  if (!run) return new Response("Unknown job", { status: 404 });

  return Response.json({ job, result: await run() });
}
