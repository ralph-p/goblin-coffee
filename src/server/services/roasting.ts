import { nanoid } from "nanoid";
import { buildRoastQueue, lossPct, packRequirements } from "@/domain/roasting";
import { roastBatchInputSchema } from "@/domain/schemas";
import type { Order } from "@/domain/types";
import type { Ctx } from "@/server/context";
import type { Repo } from "@/server/repo/types";
import { UserError } from "./errors";
import { recordMovement } from "./movements";

export async function getRoastQueue(ctx: Ctx) {
  const [products, orders, batches] = await Promise.all([
    ctx.repo.products.all(),
    ctx.repo.orders.all(),
    ctx.repo.roastBatches.all(),
  ]);
  return buildRoastQueue(products, orders, batches);
}

export async function listBatches(ctx: Ctx) {
  const [batches, products, lots] = await Promise.all([
    ctx.repo.roastBatches.all(),
    ctx.repo.products.all(),
    ctx.repo.greenLots.all(),
  ]);
  return batches
    .sort((a, b) => b.roastedAt.localeCompare(a.roastedAt))
    .map((b) => ({
      ...b,
      lossPct: lossPct(b.greenG, b.roastedG),
      productName: products.find((p) => p.id === b.productId)?.name ?? "—",
      lotCode: lots.find((l) => l.id === b.lotId)?.code ?? "—",
    }));
}

/**
 * Log a roast: green coffee leaves the lot, roasted coffee lands on the
 * product's shelf, and both moves are written to the audit log.
 */
export async function logRoastBatch(ctx: Ctx, raw: unknown) {
  const parsed = roastBatchInputSchema.safeParse(raw);
  if (!parsed.success) throw new UserError(parsed.error.issues[0].message);
  const input = parsed.data;
  const now = ctx.now();

  return ctx.repo.transaction(async (tx) => {
    const lot = await tx.greenLots.get(input.lotId);
    const product = await tx.products.get(input.productId);
    if (!lot || !product) throw new UserError("Choose a green lot and a coffee.");
    if (input.greenG > lot.remainingG) {
      throw new UserError(`Lot ${lot.code} only has ${lot.remainingG} g of green coffee left.`);
    }

    const batch = await tx.roastBatches.insert({
      id: `rb_${nanoid(8)}`,
      ...input,
      roastedAt: new Date(`${input.roastedAt}T12:00:00`).toISOString(),
      createdAt: now.toISOString(),
    });
    await tx.greenLots.update(lot.id, (l) => ({ ...l, remainingG: l.remainingG - input.greenG }));
    await tx.products.update(product.id, (p) => ({
      ...p,
      roastedOnHandG: p.roastedOnHandG + input.roastedG,
    }));
    await recordMovement(tx, now, {
      kind: "green", itemId: lot.id, itemName: `${lot.code} ${lot.name}`, delta: -input.greenG,
      unit: "g", reason: "roast_batch", ref: batch.id, note: "",
    });
    await recordMovement(tx, now, {
      kind: "roasted", itemId: product.id, itemName: product.name, delta: input.roastedG,
      unit: "g", reason: "roast_batch", ref: batch.id, note: `${lossPct(input.greenG, input.roastedG)}% loss`,
    });
    return batch;
  });
}

/**
 * Called inside the "packed" transition. Requires enough roasted coffee on
 * the shelf, then deducts it and the packaging bill of materials.
 * Returns notes for the order timeline (e.g. packaging running low).
 */
export async function applyPacking(tx: Repo, order: Order, now: Date): Promise<string[]> {
  const products = await tx.products.all();
  const { roasted, packaging } = packRequirements(order, products);

  for (const [productId, grams] of roasted) {
    const p = products.find((x) => x.id === productId);
    if (!p) throw new UserError("A coffee in this order no longer exists.");
    if (p.roastedOnHandG < grams) {
      throw new UserError(
        `Roast first: ${p.name} needs ${grams} g but only ${p.roastedOnHandG} g is on the shelf.`,
      );
    }
  }

  for (const [productId, grams] of roasted) {
    const p = await tx.products.update(productId, (x) => ({ ...x, roastedOnHandG: x.roastedOnHandG - grams }));
    await recordMovement(tx, now, {
      kind: "roasted", itemId: productId, itemName: p.name, delta: -grams,
      unit: "g", reason: "order_packed", ref: order.number, note: "",
    });
  }

  const notes: string[] = [];
  for (const [itemId, qty] of packaging) {
    const item = await tx.packaging.get(itemId);
    if (!item) continue;
    const updated = await tx.packaging.update(itemId, (x) => ({ ...x, onHand: x.onHand - qty }));
    await recordMovement(tx, now, {
      kind: "packaging", itemId, itemName: item.name, delta: -qty,
      unit: "ea", reason: "order_packed", ref: order.number, note: "",
    });
    if (updated.onHand < 0) notes.push(`${item.name} stock is negative (${updated.onHand}). Recount it.`);
  }
  return notes;
}
