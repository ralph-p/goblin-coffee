import type { ProvinceCode } from "./provinces";

/**
 * Sales tax rates by destination province (basis points, 500 = 5%).
 * HST provinces have a single harmonized rate; others are GST + PST/QST.
 * Confirm rates with your accountant before turning tax on.
 */
export const TAX_RATES: Record<ProvinceCode, { bps: number; label: string }> = {
  AB: { bps: 500, label: "GST 5%" },
  BC: { bps: 1200, label: "GST 5% + PST 7%" },
  MB: { bps: 1200, label: "GST 5% + RST 7%" },
  NB: { bps: 1500, label: "HST 15%" },
  NL: { bps: 1500, label: "HST 15%" },
  NS: { bps: 1400, label: "HST 14%" },
  NT: { bps: 500, label: "GST 5%" },
  NU: { bps: 500, label: "GST 5%" },
  ON: { bps: 1300, label: "HST 13%" },
  PE: { bps: 1500, label: "HST 15%" },
  QC: { bps: 1498, label: "GST 5% + QST 9.975%" },
  SK: { bps: 1100, label: "GST 5% + PST 6%" },
  YT: { bps: 500, label: "GST 5%" },
};

/**
 * Tax on the taxable share of the order. Shipping follows the goods it
 * carries, so it is taxed in proportion to the taxable part of the subtotal.
 * (Plain coffee beans are zero-rated, so a coffee-only order owes no tax.)
 */
export function computeTax(opts: {
  enabled: boolean;
  province: ProvinceCode;
  subtotalCents: number;
  taxableSubtotalCents: number;
  shippingCents: number;
}): { taxCents: number; taxLabel: string | null } {
  const { enabled, province, subtotalCents, taxableSubtotalCents, shippingCents } = opts;
  if (!enabled || taxableSubtotalCents <= 0 || subtotalCents <= 0) {
    return { taxCents: 0, taxLabel: null };
  }
  const rate = TAX_RATES[province];
  const taxableShipping = Math.round((shippingCents * taxableSubtotalCents) / subtotalCents);
  const base = taxableSubtotalCents + taxableShipping;
  return { taxCents: Math.round((base * rate.bps) / 10_000), taxLabel: rate.label };
}
