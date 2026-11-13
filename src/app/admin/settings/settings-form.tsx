"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FormMessage, selectClass, SubmitButton } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROVINCES, PROVINCE_CODES, type ProvinceCode } from "@/domain/provinces";
import { TAX_RATES } from "@/domain/tax";
import type { Settings } from "@/domain/types";
import { centsToInput, parseDollars } from "@/lib/format";
import { saveSettingsAction } from "../actions";

function Section({ title, children, description }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const dollarsOrNull = (s: string) => (s.trim() === "" ? null : parseDollars(s));

export function SettingsForm({ initial }: { initial: Settings }) {
  const [state, action] = useActionState(saveSettingsAction, { ok: false });
  const [s, setS] = useState(initial);
  // Money fields are edited as dollar strings and converted on submit.
  const [money, setMoney] = useState({
    deliveryFee: centsToInput(initial.localDelivery.feeCents),
    deliveryFreeOver: centsToInput(initial.localDelivery.freeOverCents),
    shipFreeOver: centsToInput(initial.shipping.freeOverCents),
  });
  const [fsas, setFsas] = useState(initial.localDelivery.fsas.join(", "));
  const [bands, setBands] = useState(
    initial.shipping.regions.map((r) => r.bands.map((b) => ({ maxWeightG: String(b.maxWeightG), price: centsToInput(b.priceCents) }))),
  );

  const payload = JSON.stringify({
    ...s,
    localDelivery: {
      ...s.localDelivery,
      feeCents: parseDollars(money.deliveryFee) || 0,
      freeOverCents: dollarsOrNull(money.deliveryFreeOver),
      fsas: fsas.split(/[\s,]+/).map((x) => x.trim().toUpperCase()).filter(Boolean),
    },
    shipping: {
      freeOverCents: dollarsOrNull(money.shipFreeOver),
      regions: s.shipping.regions.map((r, i) => ({
        ...r,
        bands: bands[i].map((b) => ({ maxWeightG: Number(b.maxWeightG), priceCents: parseDollars(b.price) })),
      })),
    },
  });

  const setBand = (ri: number, bi: number, patch: Partial<{ maxWeightG: string; price: string }>) =>
    setBands((all) => all.map((r, i) => (i !== ri ? r : r.map((b, j) => (j === bi ? { ...b, ...patch } : b)))));

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="payload" value={payload} />

      <Section title="Interac e-Transfer" description="Shown on order confirmations and payment emails.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 sm:col-span-3">
            <Label htmlFor="etransferEmail">Send e-Transfers to</Label>
            <Input id="etransferEmail" type="email" value={s.etransferEmail} onChange={(e) => setS({ ...s, etransferEmail: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="window">Payment window (days)</Label>
            <Input id="window" type="number" min={1} max={14} value={s.paymentWindowDays} onChange={(e) => setS({ ...s, paymentWindowDays: Number(e.target.value) })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reminder">Reminder after (days)</Label>
            <Input id="reminder" type="number" min={0} max={13} value={s.reminderAfterDays} onChange={(e) => setS({ ...s, reminderAfterDays: Number(e.target.value) })} />
          </div>
        </div>
      </Section>

      <Section title="Pickup">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.pickup.enabled} onChange={(e) => setS({ ...s, pickup: { ...s.pickup, enabled: e.target.checked } })} className="accent-[var(--moss)]" />
          Offer free pickup
        </label>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pickupLoc">Location</Label>
          <Input id="pickupLoc" value={s.pickup.location} onChange={(e) => setS({ ...s, pickup: { ...s.pickup, location: e.target.value } })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pickupInstr">Instructions</Label>
          <Textarea id="pickupInstr" rows={2} value={s.pickup.instructions} onChange={(e) => setS({ ...s, pickup: { ...s.pickup, instructions: e.target.value } })} />
        </div>
      </Section>

      <Section title="Local delivery" description="Matched on the first three characters of the postal code (FSA).">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.localDelivery.enabled} onChange={(e) => setS({ ...s, localDelivery: { ...s.localDelivery, enabled: e.target.checked } })} className="accent-[var(--moss)]" />
          Offer local delivery
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fee">Fee ($)</Label>
            <Input id="fee" inputMode="decimal" value={money.deliveryFee} onChange={(e) => setMoney({ ...money, deliveryFee: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="freeOver">Free over ($, blank = never)</Label>
            <Input id="freeOver" inputMode="decimal" value={money.deliveryFreeOver} onChange={(e) => setMoney({ ...money, deliveryFreeOver: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="fsas">Postal code areas</Label>
            <Input id="fsas" value={fsas} onChange={(e) => setFsas(e.target.value)} placeholder="K1N, K1P, K2P" />
          </div>
        </div>
      </Section>

      <Section title="Shipping" description="Rates by region and total parcel weight. The first band the parcel fits into applies.">
        <div className="flex flex-col gap-1.5 sm:w-64">
          <Label htmlFor="shipFree">Free shipping over ($, blank = never)</Label>
          <Input id="shipFree" inputMode="decimal" value={money.shipFreeOver} onChange={(e) => setMoney({ ...money, shipFreeOver: e.target.value })} />
        </div>
        {s.shipping.regions.map((r, ri) => (
          <div key={r.id} className="rounded-lg border border-border p-3">
            <p className="font-medium">{r.name}</p>
            <p className="text-xs text-muted-foreground">{r.provinces.map((p) => PROVINCES[p]).join(", ")}</p>
            <div className="mt-3 flex flex-col gap-2">
              {bands[ri].map((b, bi) => (
                <div key={bi} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Up to</span>
                  <Input type="number" className="w-24" value={b.maxWeightG} onChange={(e) => setBand(ri, bi, { maxWeightG: e.target.value })} aria-label="Max weight in grams" />
                  <span className="text-muted-foreground">g →</span>
                  <Input inputMode="decimal" className="w-24" value={b.price} onChange={(e) => setBand(ri, bi, { price: e.target.value })} aria-label="Price" />
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove band" onClick={() => setBands((all) => all.map((x, i) => (i === ri ? x.filter((_, j) => j !== bi) : x)))}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setBands((all) => all.map((x, i) => (i === ri ? [...x, { maxWeightG: "", price: "" }] : x)))}>
                <Plus /> Add band
              </Button>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Sales tax" description="Charged by destination province on taxable products only. Plain coffee beans are zero-rated basic groceries. Check with your accountant.">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.tax.enabled} onChange={(e) => setS({ ...s, tax: { enabled: e.target.checked } })} className="accent-[var(--moss)]" />
          Charge GST/HST/PST (turn on once you&apos;re registered)
        </label>
        <div className="flex flex-col gap-1.5 sm:w-64">
          <Label htmlFor="bizProv">Business province (for pickup and local delivery)</Label>
          <select id="bizProv" className={selectClass} value={s.businessProvince} onChange={(e) => setS({ ...s, businessProvince: e.target.value as ProvinceCode })}>
            {PROVINCE_CODES.map((p) => <option key={p} value={p}>{PROVINCES[p]} ({TAX_RATES[p].label})</option>)}
          </select>
        </div>
      </Section>

      <div className="sticky bottom-0 flex items-center gap-4 border-t border-border bg-background/95 py-4 backdrop-blur">
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
