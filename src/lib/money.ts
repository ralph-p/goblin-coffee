/**
 * Money is always stored as integer cents (CAD). Never use floats for prices.
 */
const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export function formatCents(cents: number) {
  return cad.format(cents / 100);
}
