import { lineKey, type CartLine } from "@/domain/cart";
import type { PricedLine } from "@/domain/pricing";
import type { Grind, Product, Variant } from "@/domain/types";
import type { Ctx } from "@/server/context";

export interface ResolvedLine extends PricedLine {
  key: string;
  product: Pick<Product, "id" | "name" | "slug" | "images" | "roastLevel">;
  variant: Pick<Variant, "id" | "label" | "sizeG">;
  grind: Grind;
}

/**
 * Turn cookie cart lines into priced lines using current catalog data.
 * Lines for unavailable products/sizes/grinds are dropped, and `changed`
 * tells the caller to rewrite the cookie.
 */
export async function resolveCart(ctx: Ctx, cart: CartLine[]) {
  const products = await ctx.repo.products.filter((p) => p.status === "active");
  const lines: ResolvedLine[] = [];
  for (const l of cart) {
    const product = products.find((p) => p.variants.some((v) => v.id === l.variantId));
    const variant = product?.variants.find((v) => v.id === l.variantId);
    if (!product || !variant?.active || !product.grinds.includes(l.grind)) continue;
    lines.push({
      key: lineKey(l),
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        images: product.images,
        roastLevel: product.roastLevel,
      },
      variant: { id: variant.id, label: variant.label, sizeG: variant.sizeG },
      grind: l.grind,
      qty: l.qty,
      unitPriceCents: variant.priceCents,
      shipWeightG: variant.shipWeightG,
      taxable: product.taxable,
    });
  }
  return { lines, changed: lines.length !== cart.length };
}
