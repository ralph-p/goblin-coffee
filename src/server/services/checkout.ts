import { randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import type { CartLine } from "@/domain/cart";
import { priceOrder } from "@/domain/pricing";
import { normalizePostalCode, isProvince } from "@/domain/provinces";
import { checkoutInputSchema } from "@/domain/schemas";
import type { Order } from "@/domain/types";
import type { Ctx } from "@/server/context";
import { orderEmails } from "@/emails/order-emails";
import { resolveCart } from "./cart";
import { UserError } from "./errors";
import { addEvent } from "./orders";

// ── Rate limiting (in memory, per IP) ──────────────────────────────────────
const WINDOW_MS = 10 * 60_000;
const MAX_ORDERS_PER_WINDOW = 5;
const attempts = new Map<string, number[]>();

export function checkRateLimit(ip: string, now: number) {
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_ORDERS_PER_WINDOW) {
    throw new UserError("Too many orders from your connection. Please wait a few minutes.");
  }
  recent.push(now);
  attempts.set(ip, recent);
}

/**
 * Validate the checkout form, re-price the cart from the catalog (never
 * trust client prices), create the order, and email payment instructions.
 */
export async function placeOrder(
  ctx: Ctx,
  raw: unknown,
  cart: CartLine[],
  ip: string,
): Promise<Order> {
  const parsed = checkoutInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "form");
      fieldErrors[k] ??= issue.message;
    }
    throw new UserError("Please fix the highlighted fields.", fieldErrors);
  }
  const input = parsed.data;
  if (input.website) throw new UserError("Something went wrong. Please try again.");

  const now = ctx.now();
  checkRateLimit(ip, now.getTime());

  let address: Order["fulfillment"]["address"] = null;
  if (input.method !== "pickup") {
    const postalCode = normalizePostalCode(input.postalCode);
    if (!postalCode) {
      throw new UserError("Please fix the highlighted fields.", { postalCode: "Enter a valid Canadian postal code" });
    }
    if (!isProvince(input.province)) throw new UserError("Choose a province.");
    address = { line1: input.line1, line2: input.line2, city: input.city, province: input.province, postalCode };
  }

  const settings = await ctx.repo.settings.get();
  const { lines } = await resolveCart(ctx, cart);
  const priced = priceOrder(
    lines,
    { method: input.method, province: address?.province ?? null, postalCode: address?.postalCode ?? null },
    settings,
  );
  if (!priced.ok) throw new UserError(priced.error);

  const order = await ctx.repo.transaction(async (tx) => {
    const number = await tx.nextOrderNumber();
    return tx.orders.insert({
      id: `o_${nanoid(10)}`,
      number,
      accessToken: randomBytes(18).toString("base64url"),
      status: "awaiting_payment",
      customer: { name: input.name, email: input.email.toLowerCase(), phone: input.phone },
      fulfillment: { method: input.method, address },
      lines: lines.map((l) => ({
        productId: l.product.id,
        variantId: l.variant.id,
        productName: l.product.name,
        variantLabel: l.variant.label,
        grind: l.grind,
        qty: l.qty,
        unitPriceCents: l.unitPriceCents,
        sizeG: l.variant.sizeG,
      })),
      totals: priced.totals,
      customerNote: input.customerNote,
      bagReturn: input.bagReturn,
      bagReturned: false,
      paymentDueAt: new Date(now.getTime() + settings.paymentWindowDays * 86_400_000).toISOString(),
      reminderSentAt: null,
      payment: null,
      tracking: null,
      events: [{ at: now.toISOString(), type: "created", message: "Order placed" }],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  const email = orderEmails.received({ order, settings, appUrl: ctx.appUrl });
  await ctx.mailer.send({ to: order.customer.email, ...email });
  return addEvent(ctx, order.id, "email", `Sent: ${email.subject}`);
}
