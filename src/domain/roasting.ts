import type { Id, Order, PackagingItem, Product, RoastBatch } from "./types";

export const DEFAULT_LOSS_PCT = 15;

/** Moisture/weight lost during roasting, as a percentage of green weight. */
export function lossPct(greenG: number, roastedG: number) {
  if (greenG <= 0) return 0;
  return Math.round(((greenG - roastedG) / greenG) * 1000) / 10;
}

export function orderGrams(order: Pick<Order, "lines">) {
  return order.lines.reduce((sum, l) => sum + l.sizeG * l.qty, 0);
}

/** Roasted grams each product needs for one order. */
export function gramsByProduct(order: Pick<Order, "lines">) {
  const map = new Map<Id, number>();
  for (const l of order.lines) map.set(l.productId, (map.get(l.productId) ?? 0) + l.sizeG * l.qty);
  return map;
}

export function averageLossPct(batches: RoastBatch[]) {
  const usable = batches.filter((b) => b.greenG > 0);
  if (usable.length === 0) return DEFAULT_LOSS_PCT;
  const green = usable.reduce((s, b) => s + b.greenG, 0);
  const roasted = usable.reduce((s, b) => s + b.roastedG, 0);
  return lossPct(green, roasted);
}

/** Green coffee needed to end up with `roastedG` after roast loss. */
export function greenNeededFor(roastedG: number, lossPctValue: number) {
  return Math.ceil(roastedG / (1 - lossPctValue / 100));
}

export interface RoastQueueRow {
  productId: Id;
  productName: string;
  /** Grams in paid/roasting orders (committed demand). */
  demandG: number;
  /** Grams in orders still awaiting e-Transfer. */
  pendingG: number;
  onHandG: number;
  shortfallG: number;
  avgLossPct: number;
  suggestedGreenG: number;
  orderNumbers: string[];
}

/**
 * Hybrid stock model: committed orders draw on roasted stock first, and the
 * queue shows what still has to be roasted. Pending (unpaid) demand is shown
 * separately so you can roast ahead if you want to.
 */
export function buildRoastQueue(
  products: Product[],
  orders: Order[],
  batches: RoastBatch[],
): RoastQueueRow[] {
  const rows = new Map<Id, RoastQueueRow>();
  const row = (p: Product): RoastQueueRow => {
    let r = rows.get(p.id);
    if (!r) {
      const loss = averageLossPct(batches.filter((b) => b.productId === p.id));
      r = {
        productId: p.id,
        productName: p.name,
        demandG: 0,
        pendingG: 0,
        onHandG: p.roastedOnHandG,
        shortfallG: 0,
        avgLossPct: loss,
        suggestedGreenG: 0,
        orderNumbers: [],
      };
      rows.set(p.id, r);
    }
    return r;
  };
  const byId = new Map(products.map((p) => [p.id, p]));

  for (const o of orders) {
    const committed = o.status === "paid" || o.status === "roasting";
    const pending = o.status === "awaiting_payment";
    if (!committed && !pending) continue;
    for (const [productId, grams] of gramsByProduct(o)) {
      const p = byId.get(productId);
      if (!p) continue;
      const r = row(p);
      if (committed) {
        r.demandG += grams;
        if (!r.orderNumbers.includes(o.number)) r.orderNumbers.push(o.number);
      } else {
        r.pendingG += grams;
      }
    }
  }

  for (const r of rows.values()) {
    r.shortfallG = Math.max(0, r.demandG - r.onHandG);
    r.suggestedGreenG = r.shortfallG > 0 ? greenNeededFor(r.shortfallG, r.avgLossPct) : 0;
  }

  return [...rows.values()].sort(
    (a, b) => b.shortfallG - a.shortfallG || a.productName.localeCompare(b.productName),
  );
}

/**
 * What packing an order consumes: roasted grams per product and packaging
 * units per item (variant BOM × quantity).
 */
export function packRequirements(order: Pick<Order, "lines">, products: Product[]) {
  const roasted = gramsByProduct(order);
  const packaging = new Map<Id, number>();
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const l of order.lines) {
    const variant = byId.get(l.productId)?.variants.find((v) => v.id === l.variantId);
    for (const b of variant?.bom ?? []) {
      packaging.set(b.packagingItemId, (packaging.get(b.packagingItemId) ?? 0) + b.qty * l.qty);
    }
  }
  return { roasted, packaging };
}

export function isLowStock(item: PackagingItem) {
  return item.onHand <= item.reorderAt;
}
