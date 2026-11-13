import { z } from "zod";
import { GRINDS } from "./types";

export const MAX_QTY_PER_LINE = 20;

export const cartLineSchema = z.object({
  variantId: z.string().min(1),
  grind: z.enum(GRINDS),
  qty: z.number().int().min(1).max(MAX_QTY_PER_LINE),
});
export type CartLine = z.infer<typeof cartLineSchema>;

const cartSchema = z.array(cartLineSchema).max(50);

/** Parse the cart cookie. Anything malformed becomes an empty cart. */
export function parseCart(raw: string | undefined): CartLine[] {
  if (!raw) return [];
  try {
    const parsed = cartSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function lineKey(l: Pick<CartLine, "variantId" | "grind">) {
  return `${l.variantId}:${l.grind}`;
}

export function addLine(cart: CartLine[], add: CartLine): CartLine[] {
  const key = lineKey(add);
  const existing = cart.find((l) => lineKey(l) === key);
  if (!existing) return [...cart, add];
  return cart.map((l) =>
    lineKey(l) === key ? { ...l, qty: Math.min(MAX_QTY_PER_LINE, l.qty + add.qty) } : l,
  );
}

export function setLineQty(cart: CartLine[], key: string, qty: number): CartLine[] {
  if (qty <= 0) return cart.filter((l) => lineKey(l) !== key);
  return cart.map((l) =>
    lineKey(l) === key ? { ...l, qty: Math.min(MAX_QTY_PER_LINE, qty) } : l,
  );
}
