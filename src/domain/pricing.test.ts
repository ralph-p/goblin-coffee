import { describe, expect, it } from "vitest";
import { defaultSettings } from "@/server/repo/memory/seed";
import { priceOrder, type PricedLine } from "./pricing";
import type { Settings } from "./types";

const bag = (qty = 1, overrides: Partial<PricedLine> = {}): PricedLine => ({
  unitPriceCents: 2100,
  qty,
  shipWeightG: 400,
  taxable: false,
  ...overrides,
});

const settings = (patch: (s: Settings) => void = () => {}) => {
  const s = structuredClone(defaultSettings);
  patch(s);
  return s;
};

const toronto = { method: "ship" as const, province: "ON" as const, postalCode: "M5V 2T6" };

describe("priceOrder", () => {
  it("rejects an empty cart", () => {
    expect(priceOrder([], { method: "pickup", province: null, postalCode: null }, settings()).ok).toBe(false);
  });

  it("makes pickup free", () => {
    const r = priceOrder([bag()], { method: "pickup", province: null, postalCode: null }, settings());
    expect(r.ok && r.totals).toMatchObject({ shippingCents: 0, totalCents: 2100 });
  });

  it("charges local delivery inside the FSA list and refuses outside it", () => {
    const inside = priceOrder([bag()], { method: "local_delivery", province: "ON", postalCode: "K1N 5T5" }, settings());
    expect(inside.ok && inside.totals.shippingCents).toBe(500);
    const outside = priceOrder([bag()], { method: "local_delivery", province: "ON", postalCode: "M5V 2T6" }, settings());
    expect(outside.ok).toBe(false);
  });

  it("makes local delivery free over the threshold", () => {
    const r = priceOrder([bag(2)], { method: "local_delivery", province: "ON", postalCode: "K1N 5T5" }, settings());
    expect(r.ok && r.totals.shippingCents).toBe(0); // 2 × $21 = $42 ≥ $40
  });

  it("picks the shipping band by total weight and region", () => {
    const one = priceOrder([bag(1)], toronto, settings());
    expect(one.ok && one.totals.shippingCents).toBe(1100); // 400 g
    const two = priceOrder([bag(2)], { method: "ship", province: "BC", postalCode: "V8V 1A1" }, settings());
    expect(two.ok && two.totals.shippingCents).toBe(2100); // 800 g, western band 2
  });

  it("ships free over the free-shipping threshold", () => {
    const r = priceOrder([bag(4)], toronto, settings());
    expect(r.ok && r.totals.shippingCents).toBe(0); // $84 ≥ $75
  });

  it("refuses orders heavier than the largest band", () => {
    const r = priceOrder([bag(1, { shipWeightG: 6000 })], toronto, settings());
    expect(r.ok).toBe(false);
  });

  it("charges no tax when tax is off", () => {
    const r = priceOrder([bag(1, { taxable: true })], toronto, settings());
    expect(r.ok && r.totals.taxCents).toBe(0);
  });

  it("keeps zero-rated coffee untaxed even with tax on", () => {
    const s = settings((x) => {
      x.tax.enabled = true;
    });
    const r = priceOrder([bag()], toronto, s);
    expect(r.ok && r.totals.taxCents).toBe(0);
  });

  it("taxes taxable goods plus their share of shipping by destination province", () => {
    const s = settings((x) => {
      x.tax.enabled = true;
    });
    const r = priceOrder([bag(1, { taxable: true })], toronto, s);
    // (2100 + 1100) × 13% = 416
    expect(r.ok && r.totals).toMatchObject({
      taxCents: 416,
      taxLabel: "HST 13%",
      totalCents: 2100 + 1100 + 416,
    });
  });
});
