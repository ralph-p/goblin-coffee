import { redirect } from "next/navigation";
import { appCtx } from "@/server/app-context";
import { readCart } from "@/server/cart-cookie";
import { resolveCart } from "@/server/services/cart";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const ctx = appCtx();
  const { lines } = await resolveCart(ctx, await readCart());
  if (lines.length === 0) redirect("/cart");
  const settings = await ctx.repo.settings.get();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Checkout</h1>
      <p className="mt-2 text-muted-foreground">
        No card needed. Once you place your order we&apos;ll email Interac e-Transfer instructions, and we start
        roasting when your payment arrives.
      </p>
      <CheckoutForm
        lines={lines.map((l) => ({
          key: l.key,
          name: l.product.name,
          detail: `${l.variant.label} · ${l.grind.replace("_", " ")}`,
          qty: l.qty,
          unitPriceCents: l.unitPriceCents,
          shipWeightG: l.shipWeightG,
          taxable: l.taxable,
        }))}
        settings={settings}
      />
    </main>
  );
}
