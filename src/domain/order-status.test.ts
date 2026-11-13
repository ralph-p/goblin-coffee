import { describe, expect, it } from "vitest";
import { canTransition, nextStatuses } from "./order-status";
import type { FulfillmentMethod, OrderStatus } from "./types";

const o = (status: OrderStatus, method: FulfillmentMethod = "ship") => ({
  status,
  fulfillment: { method, address: null },
});

describe("order status machine", () => {
  it("follows the happy path", () => {
    expect(canTransition(o("awaiting_payment"), "paid")).toBe(true);
    expect(canTransition(o("paid"), "roasting")).toBe(true);
    expect(canTransition(o("roasting"), "packed")).toBe(true);
    expect(canTransition(o("packed"), "shipped")).toBe(true);
    expect(canTransition(o("shipped"), "completed")).toBe(true);
  });

  it("lets paid orders skip roasting when coffee is already on the shelf", () => {
    expect(canTransition(o("paid"), "packed")).toBe(true);
  });

  it("routes pickup orders to ready_for_pickup, not shipped", () => {
    expect(nextStatuses(o("packed", "pickup"))).toEqual(["ready_for_pickup"]);
    expect(nextStatuses(o("packed", "local_delivery"))).toEqual(["shipped"]);
  });

  it("only allows cancelling before roasting starts", () => {
    expect(canTransition(o("awaiting_payment"), "cancelled")).toBe(true);
    expect(canTransition(o("paid"), "cancelled")).toBe(true);
    expect(canTransition(o("roasting"), "cancelled")).toBe(false);
    expect(canTransition(o("shipped"), "cancelled")).toBe(false);
  });

  it("rejects skipping payment and moving backwards", () => {
    expect(canTransition(o("awaiting_payment"), "packed")).toBe(false);
    expect(canTransition(o("packed"), "paid")).toBe(false);
    expect(nextStatuses(o("completed"))).toEqual([]);
  });
});
