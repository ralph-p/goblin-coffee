import { computeTax } from "./tax";
import { fsaOf, type ProvinceCode } from "./provinces";
import type { FulfillmentMethod, Settings, Totals } from "./types";

/** A cart line with the facts pricing needs, already resolved from the catalog. */
export interface PricedLine {
  unitPriceCents: number;
  qty: number;
  shipWeightG: number;
  taxable: boolean;
}

export interface FulfillmentInput {
  method: FulfillmentMethod;
  province: ProvinceCode | null; // destination (ship) or delivery province
  postalCode: string | null;
}

export type PriceResult =
  | { ok: true; totals: Totals; shippingNote: string }
  | { ok: false; error: string };

export function subtotalOf(lines: PricedLine[]) {
  return lines.reduce((sum, l) => sum + l.unitPriceCents * l.qty, 0);
}

export function weightOf(lines: PricedLine[]) {
  return lines.reduce((sum, l) => sum + l.shipWeightG * l.qty, 0);
}

function quoteShipping(
  lines: PricedLine[],
  subtotalCents: number,
  f: FulfillmentInput,
  s: Settings,
): { ok: true; cents: number; note: string } | { ok: false; error: string } {
  switch (f.method) {
    case "pickup":
      if (!s.pickup.enabled) return { ok: false, error: "Pickup is not available right now." };
      return { ok: true, cents: 0, note: "Free pickup" };

    case "local_delivery": {
      if (!s.localDelivery.enabled) {
        return { ok: false, error: "Local delivery is not available right now." };
      }
      if (!f.postalCode) return { ok: false, error: "Enter a postal code for delivery." };
      if (!s.localDelivery.fsas.includes(fsaOf(f.postalCode))) {
        return { ok: false, error: "Sorry, that postal code is outside our delivery area." };
      }
      const free =
        s.localDelivery.freeOverCents !== null && subtotalCents >= s.localDelivery.freeOverCents;
      return free
        ? { ok: true, cents: 0, note: "Free local delivery" }
        : { ok: true, cents: s.localDelivery.feeCents, note: "Local delivery" };
    }

    case "ship": {
      if (!f.province) return { ok: false, error: "Choose a province to ship to." };
      const region = s.shipping.regions.find((r) => r.provinces.includes(f.province!));
      if (!region) return { ok: false, error: "We don't ship to that province yet." };
      if (s.shipping.freeOverCents !== null && subtotalCents >= s.shipping.freeOverCents) {
        return { ok: true, cents: 0, note: "Free shipping" };
      }
      const weight = weightOf(lines);
      const band = region.bands.find((b) => weight <= b.maxWeightG);
      if (!band) {
        return {
          ok: false,
          error: "This order is too heavy for our standard rates. Contact us for a quote.",
        };
      }
      return { ok: true, cents: band.priceCents, note: `Shipping to ${region.name}` };
    }
  }
}

/**
 * Pure pricing used by both the checkout UI (live totals) and the server
 * (authoritative totals when the order is created).
 */
export function priceOrder(
  lines: PricedLine[],
  fulfillment: FulfillmentInput,
  settings: Settings,
): PriceResult {
  if (lines.length === 0) return { ok: false, error: "Your cart is empty." };

  const subtotalCents = subtotalOf(lines);
  const shipping = quoteShipping(lines, subtotalCents, fulfillment, settings);
  if (!shipping.ok) return shipping;

  const taxableSubtotalCents = subtotalOf(lines.filter((l) => l.taxable));
  const { taxCents, taxLabel } = computeTax({
    enabled: settings.tax.enabled,
    province:
      fulfillment.method === "ship" && fulfillment.province
        ? fulfillment.province
        : settings.businessProvince,
    subtotalCents,
    taxableSubtotalCents,
    shippingCents: shipping.cents,
  });

  return {
    ok: true,
    shippingNote: shipping.note,
    totals: {
      subtotalCents,
      shippingCents: shipping.cents,
      taxCents,
      taxLabel,
      totalCents: subtotalCents + shipping.cents + taxCents,
    },
  };
}
