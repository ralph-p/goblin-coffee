import { describe, expect, it } from "vitest";
import { testCtx } from "@/test/test-ctx";
import { placeOrder } from "./checkout";
import { cancelUnpaidOrders, sendPaymentReminders } from "./jobs";
import { advanceOrder, markPaid } from "./orders";

const form = {
  name: "Robin Woods",
  email: "Robin@Example.com",
  phone: "",
  method: "ship" as const,
  line1: "1 Birch Rd",
  line2: "",
  city: "Toronto",
  province: "ON" as const,
  postalCode: "m5v2t6",
  customerNote: "",
  bagReturn: true,
  website: "",
};
const cart = [{ variantId: "v_ms_340", grind: "drip" as const, qty: 2 }];
let ip = 0;
const nextIp = () => `10.0.0.${++ip}`;

describe("checkout", () => {
  it("creates an awaiting-payment order with server-side prices and emails instructions", async () => {
    const { ctx, sent } = testCtx();
    const order = await placeOrder(ctx, form, cart, nextIp());
    expect(order.number).toBe("GC-1007");
    expect(order.status).toBe("awaiting_payment");
    expect(order.customer.email).toBe("robin@example.com");
    expect(order.fulfillment.address?.postalCode).toBe("M5V 2T6");
    expect(order.totals).toMatchObject({ subtotalCents: 4200, shippingCents: 1500, totalCents: 5700 });
    expect(sent).toEqual([
      { to: "robin@example.com", subject: expect.stringContaining("payment instructions") },
    ]);
  });

  it("rejects bad postal codes with a field error", async () => {
    const { ctx } = testCtx();
    await expect(placeOrder(ctx, { ...form, postalCode: "12345" }, cart, nextIp())).rejects.toMatchObject({
      fieldErrors: { postalCode: expect.any(String) },
    });
  });

  it("rejects bots that fill the honeypot", async () => {
    const { ctx } = testCtx();
    await expect(placeOrder(ctx, { ...form, website: "spam" }, cart, nextIp())).rejects.toThrow();
  });

  it("ignores cart lines for unknown variants", async () => {
    const { ctx } = testCtx();
    await expect(
      placeOrder(ctx, form, [{ variantId: "nope", grind: "drip", qty: 1 }], nextIp()),
    ).rejects.toThrow(/empty/);
  });

  it("rate-limits repeated orders from one IP", async () => {
    const { ctx } = testCtx();
    const same = nextIp();
    for (let i = 0; i < 5; i++) await placeOrder(ctx, form, cart, same);
    await expect(placeOrder(ctx, form, cart, same)).rejects.toThrow(/Too many/);
  });
});

describe("order lifecycle", () => {
  it("goes from payment to pickup, emailing at each customer-facing step", async () => {
    const { ctx, sent } = testCtx();
    const order = await placeOrder(
      ctx,
      { ...form, method: "pickup" },
      [{ variantId: "v_gh_340", grind: "espresso", qty: 1 }],
      nextIp(),
    );
    await markPaid(ctx, order.id, { amountCents: order.totals.totalCents, reference: "CAxyz" });
    await advanceOrder(ctx, order.id, "packed");
    const ready = await advanceOrder(ctx, order.id, "ready_for_pickup");
    expect(ready.status).toBe("ready_for_pickup");
    expect(sent.map((s) => s.subject)).toEqual([
      expect.stringContaining("received"),
      expect.stringContaining("Payment received"),
      expect.stringContaining("ready for pickup"),
    ]);
  });
});

describe("scheduled jobs", () => {
  it("reminds once after the reminder delay, then cancels after the window", async () => {
    const { ctx, sent, advanceDays } = testCtx();
    const order = await placeOrder(ctx, form, cart, nextIp());
    sent.length = 0;

    advanceDays(1.1);
    expect((await sendPaymentReminders(ctx)).reminded).toContain(order.number);
    expect((await sendPaymentReminders(ctx)).reminded).not.toContain(order.number);

    advanceDays(2);
    expect((await cancelUnpaidOrders(ctx)).cancelled).toContain(order.number);
    expect((await ctx.repo.orders.get(order.id))!.status).toBe("cancelled");
  });
});
