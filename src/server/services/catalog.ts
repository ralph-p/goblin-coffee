import { nanoid } from "nanoid";
import { buildRoastQueue } from "@/domain/roasting";
import { productInputSchema, type ProductInput } from "@/domain/schemas";
import type { GreenLot, Product } from "@/domain/types";
import type { Ctx } from "@/server/context";
import { UserError } from "./errors";

export type StockStatus = "in_stock" | "roast_to_order";

export interface StorefrontProduct extends Product {
  lot: GreenLot | null;
  lastRoastedAt: string | null;
  stock: StockStatus;
}

async function decorate(ctx: Ctx, products: Product[]): Promise<StorefrontProduct[]> {
  const [orders, batches, lots] = await Promise.all([
    ctx.repo.orders.all(),
    ctx.repo.roastBatches.all(),
    ctx.repo.greenLots.all(),
  ]);
  const queue = buildRoastQueue(products, orders, batches);
  return products.map((p) => {
    const row = queue.find((r) => r.productId === p.id);
    const committed = row?.demandG ?? 0;
    const smallestBag = Math.min(...p.variants.filter((v) => v.active).map((v) => v.sizeG));
    const available = p.roastedOnHandG - committed;
    const last = batches
      .filter((b) => b.productId === p.id)
      .sort((a, b) => b.roastedAt.localeCompare(a.roastedAt))[0];
    return {
      ...p,
      lot: lots.find((l) => l.id === p.greenLotId) ?? null,
      lastRoastedAt: last?.roastedAt ?? null,
      stock: available >= smallestBag ? "in_stock" : "roast_to_order",
    };
  });
}

const visible = (p: Product) =>
  p.status === "active" && p.variants.some((v) => v.active);

export async function listStorefrontProducts(ctx: Ctx) {
  const products = await ctx.repo.products.filter(visible);
  return decorate(ctx, products.sort((a, b) => a.name.localeCompare(b.name)));
}

export async function getStorefrontProduct(ctx: Ctx, slug: string) {
  const p = await ctx.repo.products.findOne((x) => x.slug === slug && visible(x));
  if (!p) return null;
  const [decorated] = await decorate(ctx, [p]);
  return decorated;
}

// ── Admin ─────────────────────────────────────────────────────────────────

export async function listProducts(ctx: Ctx) {
  const all = await ctx.repo.products.all();
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export function getProduct(ctx: Ctx, id: string) {
  return ctx.repo.products.get(id);
}

/** Create (no id) or update a product from validated form input. */
export async function saveProduct(ctx: Ctx, raw: unknown, id?: string): Promise<Product> {
  const parsed = productInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new UserError(`${first.path.join(".")}: ${first.message}`);
  }
  const input: ProductInput = parsed.data;
  const now = ctx.now().toISOString();

  return ctx.repo.transaction(async (tx) => {
    const clash = await tx.products.findOne((p) => p.slug === input.slug && p.id !== id);
    if (clash) throw new UserError(`The slug "${input.slug}" is already used by ${clash.name}.`);

    const skus = input.variants.map((v) => v.sku);
    if (new Set(skus).size !== skus.length) throw new UserError("Each size needs a unique SKU.");

    const variants = input.variants.map((v) => ({ ...v, id: v.id || `v_${nanoid(8)}` }));

    if (!id) {
      return tx.products.insert({
        ...input,
        id: `p_${nanoid(8)}`,
        variants,
        images: [],
        roastedOnHandG: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
    return tx.products.update(id, (p) => ({ ...p, ...input, variants, updatedAt: now }));
  });
}

export async function addProductImage(ctx: Ctx, id: string, key: string, alt: string) {
  return ctx.repo.products.update(id, (p) => ({
    ...p,
    images: [...p.images, { key, alt }],
    updatedAt: ctx.now().toISOString(),
  }));
}

export async function removeProductImage(ctx: Ctx, id: string, key: string) {
  return ctx.repo.products.update(id, (p) => ({
    ...p,
    images: p.images.filter((i) => i.key !== key),
    updatedAt: ctx.now().toISOString(),
  }));
}

/** Move an image to the front so it becomes the cover photo. */
export async function makeCoverImage(ctx: Ctx, id: string, key: string) {
  return ctx.repo.products.update(id, (p) => {
    const img = p.images.find((i) => i.key === key);
    if (!img) return p;
    return { ...p, images: [img, ...p.images.filter((i) => i.key !== key)] };
  });
}
