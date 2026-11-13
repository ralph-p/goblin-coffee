import { isLowStock } from "@/domain/roasting";
import type { Ctx } from "@/server/context";
import { getRoastQueue } from "./roasting";

export async function getDashboard(ctx: Ctx) {
  const [orders, packaging, queue, lots, movements] = await Promise.all([
    ctx.repo.orders.all(),
    ctx.repo.packaging.all(),
    getRoastQueue(ctx),
    ctx.repo.greenLots.all(),
    ctx.repo.movements.filter((m) => m.kind === "bag_return"),
  ]);
  const awaiting = orders.filter((o) => o.status === "awaiting_payment");
  const now = ctx.now().getTime();
  return {
    awaitingCount: awaiting.length,
    awaitingCents: awaiting.reduce((s, o) => s + o.totals.totalCents, 0),
    overdueCount: awaiting.filter((o) => Date.parse(o.paymentDueAt) < now).length,
    toPack: orders.filter((o) => o.status === "paid" || o.status === "roasting").length,
    toShip: orders.filter((o) => o.status === "packed").length,
    roastShortfallG: queue.reduce((s, r) => s + r.shortfallG, 0),
    queue: queue.filter((r) => r.shortfallG > 0),
    lowPackaging: packaging.filter(isLowStock),
    lowGreen: lots.filter((l) => l.remainingG > 0 && l.remainingG < 10_000),
    bagsReturned: movements.reduce((s, m) => s + m.delta, 0),
    recent: [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
  };
}
