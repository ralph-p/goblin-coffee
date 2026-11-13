import Link from "next/link";
import { ProductArt } from "@/components/brand/product-art";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { subtotalOf } from "@/domain/pricing";
import { GRIND_LABELS } from "@/domain/types";
import { formatCents } from "@/lib/money";
import { storage } from "@/server/adapters/storage";
import { appCtx } from "@/server/app-context";
import { readCart } from "@/server/cart-cookie";
import { resolveCart } from "@/server/services/cart";
import { selectClass } from "@/components/forms";
import { updateCartLineAction } from "../actions";

export const metadata = { title: "Cart" };

export default async function CartPage() {
  const { lines } = await resolveCart(appCtx(), await readCart());

  if (lines.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Your cart is empty</h1>
        <p className="text-muted-foreground">Find something freshly roasted.</p>
        <Link href="/shop" className={buttonVariants()}>Browse coffees</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Your cart</h1>
      <ul className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
        {lines.map((l) => {
          const img = l.product.images[0];
          return (
            <li key={l.key} className="flex gap-4 p-4">
              <div className="w-20 shrink-0 overflow-hidden rounded-lg">
                <ProductArt roastLevel={l.product.roastLevel} imageUrl={img ? storage().url(img.key) : null} alt={l.product.name} />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Link href={`/shop/${l.product.slug}`} className="font-medium hover:text-primary">
                  {l.product.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {l.variant.label} · {GRIND_LABELS[l.grind]} · {formatCents(l.unitPriceCents)} each
                </p>
                <div className="mt-auto flex items-center gap-2">
                  <form action={updateCartLineAction} className="flex items-center gap-2">
                    <input type="hidden" name="key" value={l.key} />
                    <label className="sr-only" htmlFor={`qty-${l.key}`}>Quantity</label>
                    <input id={`qty-${l.key}`} name="qty" type="number" min={0} max={20} defaultValue={l.qty} className={`${selectClass} w-16`} />
                    <Button type="submit" variant="outline" size="sm">Update</Button>
                  </form>
                  <form action={updateCartLineAction}>
                    <input type="hidden" name="key" value={l.key} />
                    <input type="hidden" name="qty" value="0" />
                    <Button type="submit" variant="ghost" size="sm">Remove</Button>
                  </form>
                </div>
              </div>
              <p className="font-medium">{formatCents(l.unitPriceCents * l.qty)}</p>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex flex-col items-end gap-3">
        <p className="text-lg">
          Subtotal <span className="font-semibold">{formatCents(subtotalOf(lines))}</span>
        </p>
        <p className="text-sm text-muted-foreground">Delivery and any tax are calculated at checkout.</p>
        <Link href="/checkout" className={buttonVariants({ size: "lg", className: "px-6" })}>
          Checkout
        </Link>
      </div>
    </main>
  );
}
