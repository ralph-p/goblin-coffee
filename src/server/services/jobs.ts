import { orderEmails } from "@/emails/order-emails";
import type { Ctx } from "@/server/context";
import { addEvent, cancelOrder } from "./orders";

const DAY = 86_400_000;

/** Nudge customers who haven't sent their e-Transfer yet (once per order). */
export async function sendPaymentReminders(ctx: Ctx) {
  const now = ctx.now().getTime();
  const settings = await ctx.repo.settings.get();
  const due = await ctx.repo.orders.filter(
    (o) =>
      o.status === "awaiting_payment" &&
      !o.reminderSentAt &&
      now - Date.parse(o.createdAt) >= settings.reminderAfterDays * DAY &&
      now < Date.parse(o.paymentDueAt),
  );
  for (const o of due) {
    const msg = orderEmails.reminder({ order: o, settings, appUrl: ctx.appUrl });
    await ctx.mailer.send({ to: o.customer.email, ...msg });
    await ctx.repo.orders.update(o.id, (x) => ({ ...x, reminderSentAt: ctx.now().toISOString() }));
    await addEvent(ctx, o.id, "email", `Sent: ${msg.subject}`);
  }
  return { reminded: due.map((o) => o.number) };
}

/** Release orders whose payment window has passed. */
export async function cancelUnpaidOrders(ctx: Ctx) {
  const now = ctx.now().getTime();
  const overdue = await ctx.repo.orders.filter(
    (o) => o.status === "awaiting_payment" && Date.parse(o.paymentDueAt) < now,
  );
  for (const o of overdue) {
    await cancelOrder(ctx, o.id, "payment wasn't received in time");
  }
  return { cancelled: overdue.map((o) => o.number) };
}

export const JOBS = {
  "payment-reminders": sendPaymentReminders,
  "cancel-unpaid": cancelUnpaidOrders,
} as const;
export type JobName = keyof typeof JOBS;
