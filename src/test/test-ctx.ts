import { memoryMailer } from "@/server/adapters/mailer";
import type { Ctx } from "@/server/context";
import { createMemoryRepo } from "@/server/repo/memory/memory-repo";
import { seed } from "@/server/repo/memory/seed";

/** A fresh seeded repo, a capturing mailer and a controllable clock. */
export function testCtx(start = new Date("2026-11-12T15:00:00Z")) {
  let now = start;
  const { mailer, sent } = memoryMailer();
  const ctx: Ctx = {
    repo: createMemoryRepo({ data: seed(start.getTime()) }),
    mailer,
    now: () => now,
    appUrl: "http://test.local",
  };
  return {
    ctx,
    sent,
    advanceDays(days: number) {
      now = new Date(now.getTime() + days * 86_400_000);
    },
  };
}
