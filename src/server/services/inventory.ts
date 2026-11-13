import { nanoid } from "nanoid";
import type { z } from "zod";
import { isLowStock } from "@/domain/roasting";
import { greenLotInputSchema, packagingInputSchema } from "@/domain/schemas";
import type { Ctx } from "@/server/context";
import { UserError } from "./errors";
import { recordMovement } from "./movements";

function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const r = schema.safeParse(raw);
  if (!r.success) throw new UserError(r.error.issues[0].message);
  return r.data;
}

// ── Green coffee ──────────────────────────────────────────────────────────

export async function listGreenLots(ctx: Ctx) {
  const lots = await ctx.repo.greenLots.all();
  return lots.sort((a, b) => b.arrivedAt.localeCompare(a.arrivedAt));
}

export async function createGreenLot(ctx: Ctx, raw: unknown) {
  const input = parse(greenLotInputSchema, raw);
  const now = ctx.now();
  return ctx.repo.transaction(async (tx) => {
    if (await tx.greenLots.findOne((l) => l.code === input.code)) {
      throw new UserError(`Lot code ${input.code} already exists.`);
    }
    const lot = await tx.greenLots.insert({
      id: `lot_${nanoid(8)}`,
      code: input.code,
      name: input.name,
      supplier: input.supplier,
      origin: { country: input.country, region: input.region, producer: input.producer },
      process: input.process,
      varietal: input.varietal,
      certifications: input.certifications,
      costPerKgCents: input.costPerKgCents,
      receivedG: input.receivedG,
      remainingG: input.receivedG,
      arrivedAt: new Date(`${input.arrivedAt}T12:00:00`).toISOString(),
      notes: input.notes,
    });
    await recordMovement(tx, now, {
      kind: "green", itemId: lot.id, itemName: `${lot.code} ${lot.name}`, delta: lot.receivedG,
      unit: "g", reason: "received", ref: null, note: lot.supplier,
    });
    return lot;
  });
}

/** Manual correction after a recount, spill, sample roast, etc. */
export async function adjustGreenLot(ctx: Ctx, id: string, deltaG: number, note: string) {
  if (!Number.isInteger(deltaG) || deltaG === 0) throw new UserError("Enter a non-zero whole number of grams.");
  const now = ctx.now();
  return ctx.repo.transaction(async (tx) => {
    const lot = await tx.greenLots.get(id);
    if (!lot) throw new UserError("Lot not found.");
    if (lot.remainingG + deltaG < 0) throw new UserError(`Only ${lot.remainingG} g left in ${lot.code}.`);
    await recordMovement(tx, now, {
      kind: "green", itemId: id, itemName: `${lot.code} ${lot.name}`, delta: deltaG,
      unit: "g", reason: "adjustment", ref: null, note,
    });
    return tx.greenLots.update(id, (l) => ({ ...l, remainingG: l.remainingG + deltaG }));
  });
}

// ── Roasted coffee ────────────────────────────────────────────────────────

export async function adjustRoasted(ctx: Ctx, productId: string, deltaG: number, note: string) {
  if (!Number.isInteger(deltaG) || deltaG === 0) throw new UserError("Enter a non-zero whole number of grams.");
  const now = ctx.now();
  return ctx.repo.transaction(async (tx) => {
    const p = await tx.products.get(productId);
    if (!p) throw new UserError("Coffee not found.");
    if (p.roastedOnHandG + deltaG < 0) throw new UserError(`Only ${p.roastedOnHandG} g of ${p.name} on hand.`);
    await recordMovement(tx, now, {
      kind: "roasted", itemId: p.id, itemName: p.name, delta: deltaG,
      unit: "g", reason: "adjustment", ref: null, note,
    });
    return tx.products.update(p.id, (x) => ({ ...x, roastedOnHandG: x.roastedOnHandG + deltaG }));
  });
}

// ── Packaging ─────────────────────────────────────────────────────────────

export async function listPackaging(ctx: Ctx) {
  const items = await ctx.repo.packaging.all();
  return items
    .map((i) => ({ ...i, low: isLowStock(i) }))
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
}

export async function createPackagingItem(ctx: Ctx, raw: unknown) {
  const input = parse(packagingInputSchema, raw);
  const now = ctx.now();
  return ctx.repo.transaction(async (tx) => {
    const item = await tx.packaging.insert({ id: `pk_${nanoid(8)}`, ...input });
    if (item.onHand > 0) {
      await recordMovement(tx, now, {
        kind: "packaging", itemId: item.id, itemName: item.name, delta: item.onHand,
        unit: "ea", reason: "received", ref: null, note: "Initial stock",
      });
    }
    return item;
  });
}

export async function adjustPackaging(ctx: Ctx, id: string, delta: number, note: string) {
  if (!Number.isInteger(delta) || delta === 0) throw new UserError("Enter a non-zero whole number.");
  const now = ctx.now();
  return ctx.repo.transaction(async (tx) => {
    const item = await tx.packaging.get(id);
    if (!item) throw new UserError("Item not found.");
    await recordMovement(tx, now, {
      kind: "packaging", itemId: id, itemName: item.name, delta,
      unit: "ea", reason: delta > 0 ? "received" : "adjustment", ref: null, note,
    });
    return tx.packaging.update(id, (x) => ({ ...x, onHand: x.onHand + delta }));
  });
}

export async function setReorderPoint(ctx: Ctx, id: string, reorderAt: number) {
  if (!Number.isInteger(reorderAt) || reorderAt < 0) throw new UserError("Reorder point must be 0 or more.");
  return ctx.repo.packaging.update(id, (x) => ({ ...x, reorderAt }));
}
