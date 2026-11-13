import type { ReactElement } from "react";
import { canTransition, nextStatuses, statusLabel } from "@/domain/order-status";
import type { Order, OrderEventType, OrderStatus } from "@/domain/types";
import { orderEmails } from "@/emails/order-emails";
import { formatCents } from "@/lib/money";
import type { Ctx } from "@/server/context";
import type { Repo } from "@/server/repo/types";
import { UserError } from "./errors";
import { recordMovement } from "./movements";
import { applyPacking } from "./roasting";

export async function addEvent(ctx: Ctx, id: string, type: OrderEventType, message: string) {
  const at = ctx.now().toISOString();
  return ctx.repo.orders.update(id, (o) => ({
    ...o,
    events: [...o.events, { at, type, message }],
    updatedAt: at,
  }));
}

async function mustGet(repo: Repo, id: string) {
  const o = await repo.orders.get(id);
  if (!o) throw new UserError("Order not found.");
  return o;
}

async function email(
  ctx: Ctx,
  order: Order,
  build: (c: Parameters<typeof orderEmails.paid>[0]) => { subject: string; react: ReactElement },
) {
  const settings = await ctx.repo.settings.get();
  const msg = build({ order, settings, appUrl: ctx.appUrl });
  await ctx.mailer.send({ to: order.customer.email, ...msg });
  return addEvent(ctx, order.id, "email", `Sent: ${msg.subject}`);
}

// ── Queries ───────────────────────────────────────────────────────────────

export async function listOrders(ctx: Ctx, status?: OrderStatus | "open") {
  const open: OrderStatus[] = ["awaiting_payment", "paid", "roasting", "packed", "ready_for_pickup", "shipped"];
  const all = await ctx.repo.orders.filter((o) =>
    !status ? true : status === "open" ? open.includes(o.status) : o.status === status,
  );
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrder(ctx: Ctx, id: string) {
  return ctx.repo.orders.get(id);
}

/** Customer view: needs the secret token from their confirmation link/email. */
export async function getOrderForCustomer(ctx: Ctx, number: string, token: string) {
  const o = await ctx.repo.orders.findOne((x) => x.number === number);
  if (!o || !token || o.accessToken !== token) return null;
  return o;
}

export { nextStatuses };

// ── Workflow steps ────────────────────────────────────────────────────────

/** Record an e-Transfer you've received. Short payments are allowed but flagged. */
export async function markPaid(
  ctx: Ctx,
  id: string,
  input: { amountCents: number; reference: string },
) {
  const now = ctx.now().toISOString();
  const order = await ctx.repo.transaction(async (tx) => {
    const o = await mustGet(tx, id);
    if (!canTransition(o, "paid")) throw new UserError(`Can't mark a ${statusLabel(o.status)} order as paid.`);
    if (input.amountCents <= 0) throw new UserError("Enter the amount received.");
    const diff = input.amountCents - o.totals.totalCents;
    const note =
      diff === 0 ? "" : diff < 0 ? ` (short by ${formatCents(-diff)})` : ` (over by ${formatCents(diff)})`;
    return tx.orders.update(id, (x) => ({
      ...x,
      status: "paid",
      payment: { amountCents: input.amountCents, receivedAt: now, reference: input.reference },
      events: [
        ...x.events,
        { at: now, type: "payment", message: `e-Transfer received: ${formatCents(input.amountCents)}${note}${input.reference ? `, ref ${input.reference}` : ""}` },
      ],
      updatedAt: now,
    }));
  });
  return email(ctx, order, orderEmails.paid);
}

/**
 * Move an order forward. Packing deducts roasted coffee and packaging;
 * shipping/pickup notify the customer.
 */
export async function advanceOrder(ctx: Ctx, id: string, to: OrderStatus) {
  if (to === "paid") throw new UserError("Use Mark paid to record the e-Transfer.");
  if (to === "cancelled") throw new UserError("Use Cancel to cancel an order.");
  const now = ctx.now();

  const order = await ctx.repo.transaction(async (tx) => {
    const o = await mustGet(tx, id);
    if (!canTransition(o, to)) {
      throw new UserError(`Can't go from ${statusLabel(o.status)} to ${statusLabel(to, o.fulfillment.method)}.`);
    }
    const notes = to === "packed" ? await applyPacking(tx, o, now) : [];
    const at = now.toISOString();
    return tx.orders.update(id, (x) => ({
      ...x,
      status: to,
      events: [
        ...x.events,
        { at, type: "status", message: `Status → ${statusLabel(to, x.fulfillment.method)}` },
        ...notes.map((message) => ({ at, type: "note" as const, message })),
      ],
      updatedAt: at,
    }));
  });

  if (to === "shipped") return email(ctx, order, orderEmails.shipped);
  if (to === "ready_for_pickup") return email(ctx, order, orderEmails.readyForPickup);
  return order;
}

export async function setTracking(ctx: Ctx, id: string, carrier: string, number: string) {
  if (!carrier.trim() || !number.trim()) throw new UserError("Enter a carrier and tracking number.");
  const at = ctx.now().toISOString();
  return ctx.repo.orders.update(id, (o) => ({
    ...o,
    tracking: { carrier: carrier.trim(), number: number.trim() },
    events: [...o.events, { at, type: "tracking", message: `Tracking: ${carrier} ${number}` }],
    updatedAt: at,
  }));
}

export async function cancelOrder(ctx: Ctx, id: string, reason: string) {
  const at = ctx.now().toISOString();
  const order = await ctx.repo.transaction(async (tx) => {
    const o = await mustGet(tx, id);
    if (!canTransition(o, "cancelled")) {
      throw new UserError(`A ${statusLabel(o.status)} order can't be cancelled.`);
    }
    const refund = o.payment?.amountCents ?? 0;
    return tx.orders.update(id, (x) => ({
      ...x,
      status: "cancelled",
      events: [
        ...x.events,
        { at, type: "status", message: `Cancelled${reason ? `: ${reason}` : ""}` },
        ...(refund > 0 ? [{ at, type: "note" as const, message: `Refund ${formatCents(refund)} by e-Transfer` }] : []),
      ],
      updatedAt: at,
    }));
  });
  return email(ctx, order, (c) =>
    orderEmails.cancelled({ ...c, reason, refundCents: order.payment?.amountCents ?? 0 }),
  );
}

/** Customer brought back their empty bags; counted for sustainability stats. */
export async function markBagReturned(ctx: Ctx, id: string) {
  const now = ctx.now();
  return ctx.repo.transaction(async (tx) => {
    const o = await mustGet(tx, id);
    if (o.bagReturned) throw new UserError("Bags already marked as returned.");
    const bags = o.lines.reduce((s, l) => s + l.qty, 0);
    await recordMovement(tx, now, {
      kind: "bag_return",
      itemId: null,
      itemName: "Returned bags",
      delta: bags,
      unit: "ea",
      reason: "bag_return",
      ref: o.number,
      note: "",
    });
    const at = now.toISOString();
    return tx.orders.update(id, (x) => ({
      ...x,
      bagReturned: true,
      events: [...x.events, { at, type: "bag_return", message: `${bags} bag(s) returned` }],
      updatedAt: at,
    }));
  });
}

export function addNote(ctx: Ctx, id: string, note: string) {
  if (!note.trim()) throw new UserError("Note is empty.");
  return addEvent(ctx, id, "note", note.trim());
}
