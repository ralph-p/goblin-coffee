"use client";

import { useActionState, useState } from "react";
import { FormMessage, selectClass, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { priceOrder } from "@/domain/pricing";
import { isProvince, normalizePostalCode, PROVINCES, PROVINCE_CODES } from "@/domain/provinces";
import { FULFILLMENT_LABELS, type FulfillmentMethod, type Settings } from "@/domain/types";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { placeOrderAction } from "../actions";

interface Line {
  key: string;
  name: string;
  detail: string;
  qty: number;
  unitPriceCents: number;
  shipWeightG: number;
  taxable: boolean;
}

const methodHints: Record<FulfillmentMethod, string> = {
  pickup: "Free. Lowest footprint.",
  local_delivery: "We deliver by bike or EV nearby.",
  ship: "Canada Post, in a recycled mailer.",
};

function Field({
  id,
  label,
  error,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { id: string; label: string; error?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} aria-invalid={!!error} {...props} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function CheckoutForm({ lines, settings }: { lines: Line[]; settings: Settings }) {
  const [state, action] = useActionState(placeOrderAction, { ok: false });
  const methods = (["pickup", "local_delivery", "ship"] as const).filter(
    (m) => m === "ship" || (m === "pickup" ? settings.pickup.enabled : settings.localDelivery.enabled),
  );
  const [f, setF] = useState({
    name: "", email: "", phone: "", method: methods[0] as FulfillmentMethod,
    line1: "", line2: "", city: "", province: settings.businessProvince as string, postalCode: "",
    customerNote: "", bagReturn: true,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [k]: e.target.value }));
  const err = state.fieldErrors ?? {};

  // Live totals with the same pure pricing function the server uses.
  const postal = normalizePostalCode(f.postalCode);
  const quote = priceOrder(
    lines,
    {
      method: f.method,
      province: isProvince(f.province) ? f.province : null,
      postalCode: postal,
    },
    settings,
  );
  const needsAddress = f.method !== "pickup";
  const waiting = needsAddress && !postal;

  return (
    <form action={action} className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Full name" autoComplete="name" value={f.name} onChange={set("name")} error={err.name} required />
            <Field id="email" label="Email" type="email" autoComplete="email" value={f.email} onChange={set("email")} error={err.email} required />
            <Field id="phone" label="Phone (optional)" type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">How should we get it to you?</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {methods.map((m) => (
              <label
                key={m}
                className={cn(
                  "cursor-pointer rounded-xl border p-4 transition has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  f.method === m ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted",
                )}
              >
                <input type="radio" name="method" value={m} checked={f.method === m} onChange={set("method")} className="sr-only" />
                <span className="font-medium">{FULFILLMENT_LABELS[m]}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{methodHints[m]}</span>
              </label>
            ))}
          </div>
          {f.method === "pickup" && (
            <p className="rounded-xl bg-secondary/60 p-4 text-sm">
              <strong>{settings.pickup.location}</strong>
              <br />
              {settings.pickup.instructions}
            </p>
          )}
          {f.method === "local_delivery" && (
            <p className="text-sm text-muted-foreground">
              We deliver to postal codes starting with {settings.localDelivery.fsas.join(", ")}.
            </p>
          )}
        </section>

        {needsAddress && (
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="line1" label="Street address" autoComplete="address-line1" value={f.line1} onChange={set("line1")} error={err.line1} className="sm:col-span-2" />
              <Field id="line2" label="Apt, suite (optional)" autoComplete="address-line2" value={f.line2} onChange={set("line2")} className="sm:col-span-2" />
              <Field id="city" label="City" autoComplete="address-level2" value={f.city} onChange={set("city")} error={err.city} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="province">Province</Label>
                <select id="province" name="province" value={f.province} onChange={set("province")} className={selectClass} autoComplete="address-level1">
                  {PROVINCE_CODES.map((p) => (
                    <option key={p} value={p}>{PROVINCES[p]}</option>
                  ))}
                </select>
                {err.province && <p className="text-xs text-destructive">{err.province}</p>}
              </div>
              <Field id="postalCode" label="Postal code" autoComplete="postal-code" value={f.postalCode} onChange={set("postalCode")} error={err.postalCode} placeholder="K1N 5T5" />
            </div>
          </section>
        )}

        <section className="flex flex-col gap-4">
          <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <input
              type="checkbox"
              name="bagReturn"
              checked={f.bagReturn}
              onChange={(e) => setF((x) => ({ ...x, bagReturn: e.target.checked }))}
              className="mt-1 size-4 accent-[var(--moss)]"
            />
            <span>
              <span className="font-medium">Join the bag-return program</span>
              <span className="block text-sm text-muted-foreground">
                Hand back your empty bags at pickup or delivery and we&apos;ll reuse or compost them.
              </span>
            </span>
          </label>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customerNote">Notes (optional)</Label>
            <Textarea id="customerNote" name="customerNote" value={f.customerNote} onChange={set("customerNote")} rows={3} />
          </div>
          {/* Honeypot: hidden from people, tempting to bots. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        </section>
      </div>

      <aside className="flex h-fit flex-col gap-4 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <ul className="flex flex-col gap-3 text-sm">
          {lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-3">
              <span>
                {l.qty} × {l.name}
                <span className="block text-xs text-muted-foreground capitalize">{l.detail}</span>
              </span>
              <span>{formatCents(l.unitPriceCents * l.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
          {quote.ok ? (
            <>
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCents(quote.totals.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt>{quote.shippingNote}</dt><dd>{quote.totals.shippingCents === 0 ? "Free" : formatCents(quote.totals.shippingCents)}</dd></div>
              {quote.totals.taxCents > 0 && (
                <div className="flex justify-between"><dt>{quote.totals.taxLabel}</dt><dd>{formatCents(quote.totals.taxCents)}</dd></div>
              )}
              <div className="mt-1 flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatCents(quote.totals.totalCents)}</dd></div>
            </>
          ) : (
            <p className="text-muted-foreground">{waiting ? "Enter your postal code to see delivery cost." : quote.error}</p>
          )}
        </dl>
        <SubmitButton size="lg" pendingText="Placing order…" className="h-11 text-base">
          Place order
        </SubmitButton>
        <FormMessage state={state} />
        <p className="text-xs text-muted-foreground">
          You&apos;ll get e-Transfer instructions by email. Unpaid orders are released after{" "}
          {settings.paymentWindowDays} days.
        </p>
      </aside>
    </form>
  );
}
