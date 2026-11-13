import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Check } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { statusLabel, timelineFor } from "@/domain/order-status";
import { GRIND_LABELS } from "@/domain/types";
import { formatDate } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { appCtx } from "@/server/app-context";
import { getOrderForCustomer } from "@/server/services/orders";

export const metadata = { title: "Your order", robots: { index: false } };

export default async function OrderPage({ params, searchParams }: PageProps<"/order/[number]">) {
  await connection();
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const ctx = appCtx();
  const order = await getOrderForCustomer(ctx, number, typeof sp.t === "string" ? sp.t : "");
  if (!order) notFound();
  const settings = await ctx.repo.settings.get();

  const steps = timelineFor(order.fulfillment.method);
  const current = steps.indexOf(order.status);
  const cancelled = order.status === "cancelled";
  const isNew = sp.new === "1";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <p className="text-sm text-muted-foreground">Order {order.number}</p>
      <h1 className="mt-1 text-3xl font-semibold">
        {cancelled ? "This order was cancelled" : isNew ? "Thank you! Your order is in." : statusLabel(order.status, order.fulfillment.method)}
      </h1>

      {order.status === "awaiting_payment" && (
        <section className="mt-6 rounded-2xl border border-primary/30 bg-accent p-6">
          <h2 className="text-lg font-semibold">Complete your order with an Interac e-Transfer</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">Send to</dt>
            <dd className="flex items-center gap-2 font-medium">
              {settings.etransferEmail} <CopyButton value={settings.etransferEmail} label="email" />
            </dd>
            <dt className="text-muted-foreground">Amount</dt>
            <dd className="flex items-center gap-2 font-medium">
              {formatCents(order.totals.totalCents)}{" "}
              <CopyButton value={(order.totals.totalCents / 100).toFixed(2)} label="amount" />
            </dd>
            <dt className="text-muted-foreground">Message</dt>
            <dd className="flex items-center gap-2 font-medium">
              {order.number} <CopyButton value={order.number} label="order number" />
            </dd>
            <dt className="text-muted-foreground">Pay by</dt>
            <dd>{formatDate(order.paymentDueAt, { weekday: "long", month: "long", day: "numeric" })}</dd>
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">
            We&apos;ve also emailed these details to {order.customer.email}. Your coffee goes into the roasting queue as
            soon as the payment lands.
          </p>
        </section>
      )}

      {!cancelled && (
        <ol className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6" aria-label="Order progress">
          {steps.map((s, i) => {
            const done = i <= current;
            return (
              <li key={s} className="flex flex-col items-center gap-2 text-center text-xs">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border",
                    done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                <span className={done ? "font-medium" : "text-muted-foreground"}>
                  {statusLabel(s, order.fulfillment.method)}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {order.tracking && (
        <p className="mt-6 text-sm">
          Tracking: {order.tracking.carrier} <span className="font-medium">{order.tracking.number}</span>
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Summary</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {order.lines.map((l) => (
            <li key={`${l.variantId}${l.grind}`} className="flex justify-between">
              <span>
                {l.qty} × {l.productName}, {l.variantLabel} · {GRIND_LABELS[l.grind]}
              </span>
              <span>{formatCents(l.unitPriceCents * l.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 flex flex-col gap-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCents(order.totals.subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd>{order.totals.shippingCents ? formatCents(order.totals.shippingCents) : "Free"}</dd></div>
          {order.totals.taxCents > 0 && (
            <div className="flex justify-between"><dt>{order.totals.taxLabel}</dt><dd>{formatCents(order.totals.taxCents)}</dd></div>
          )}
          <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatCents(order.totals.totalCents)}</dd></div>
        </dl>
        <div className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
          {order.fulfillment.method === "pickup" ? (
            <p>Pickup at {settings.pickup.location}. {settings.pickup.instructions}</p>
          ) : (
            order.fulfillment.address && (
              <p>
                {order.fulfillment.method === "ship" ? "Shipping" : "Delivering"} to {order.fulfillment.address.line1},{" "}
                {order.fulfillment.address.city} {order.fulfillment.address.province} {order.fulfillment.address.postalCode}
              </p>
            )
          )}
          {order.bagReturn && <p className="mt-1">♻ You&apos;re in the bag-return program. Thank you!</p>}
        </div>
      </section>
    </main>
  );
}
