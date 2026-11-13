"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FormMessage, selectClass, SubmitButton } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProductInput } from "@/domain/schemas";
import {
  GRIND_LABELS,
  GRINDS,
  PRODUCT_STATUSES,
  ROAST_LABELS,
  ROAST_LEVELS,
  SUSTAINABILITY_TAGS,
  TAG_LABELS,
} from "@/domain/types";
import { centsToInput, parseDollars } from "@/lib/format";
import { saveProductAction } from "../actions";

type VariantDraft = Omit<ProductInput["variants"][number], "priceCents"> & { price: string };

interface Props {
  id?: string;
  initial: ProductInput;
  lots: { id: string; label: string }[];
  packaging: { id: string; name: string }[];
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

function toggle<T>(list: T[], item: T) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/**
 * Product editor. State lives in React and is submitted as one JSON payload,
 * validated server-side by the same zod schema (productInputSchema).
 */
export function ProductForm({ id, initial, lots, packaging }: Props) {
  const [state, action] = useActionState(saveProductAction, { ok: false });
  const [p, setP] = useState(initial);
  const [notes, setNotes] = useState(initial.tastingNotes.join(", "));
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [variants, setVariants] = useState<VariantDraft[]>(
    initial.variants.map(({ priceCents, ...v }) => ({ ...v, price: centsToInput(priceCents) })),
  );

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setP((x) => ({ ...x, [k]: v }));
  const setOrigin = (k: keyof ProductInput["origin"], v: string) =>
    setP((x) => ({ ...x, origin: { ...x.origin, [k]: k === "altitudeM" ? (v === "" ? null : Number(v)) : v } }));
  const setVariant = (i: number, patch: Partial<VariantDraft>) =>
    setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  const payload = JSON.stringify({
    ...p,
    tastingNotes: notes.split(",").map((n) => n.trim()).filter(Boolean),
    variants: variants.map(({ price, ...v }) => ({ ...v, priceCents: parseDollars(price) || 0 })),
  } satisfies ProductInput);

  const defaultBom = (sizeG: number) => {
    const bag = packaging.find((x) => x.name.includes(sizeG >= 1000 ? "1 kg" : `${sizeG} g`));
    return [bag, packaging.find((x) => /label/i.test(x.name)), packaging.find((x) => /valve/i.test(x.name))]
      .filter((x): x is { id: string; name: string } => Boolean(x))
      .map((x) => ({ packagingItemId: x.id, qty: 1 }));
  };

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={id ?? ""} />
      <input type="hidden" name="payload" value={payload} />

      <section className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={p.name} onChange={(e) => {
            set("name", e.target.value);
            if (!slugTouched) set("slug", slugify(e.target.value));
          }} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">URL slug</Label>
          <Input id="slug" value={p.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} />
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input id="tagline" value={p.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Bright, floral and full of stone fruit" />
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={4} value={p.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select id="status" className={selectClass} value={p.status} onChange={(e) => set("status", e.target.value as ProductInput["status"])}>
            {PRODUCT_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="roastLevel">Roast level</Label>
          <select id="roastLevel" className={selectClass} value={p.roastLevel} onChange={(e) => set("roastLevel", e.target.value as ProductInput["roastLevel"])}>
            {ROAST_LEVELS.map((r) => <option key={r} value={r}>{ROAST_LABELS[r]}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label htmlFor="notes">Tasting notes (comma separated)</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Jasmine, Bergamot, Peach" />
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
        <h2 className="font-semibold md:col-span-3">Origin & sourcing</h2>
        <div className="flex flex-col gap-1.5 md:col-span-3">
          <Label htmlFor="lot">Green lot</Label>
          <select id="lot" className={selectClass} value={p.greenLotId ?? ""} onChange={(e) => set("greenLotId", e.target.value || null)}>
            <option value="">None</option>
            {lots.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
        {(["country", "region", "producer"] as const).map((k) => (
          <div key={k} className="flex flex-col gap-1.5">
            <Label htmlFor={`o-${k}`} className="capitalize">{k}</Label>
            <Input id={`o-${k}`} value={p.origin[k]} onChange={(e) => setOrigin(k, e.target.value)} />
          </div>
        ))}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="alt">Altitude (m)</Label>
          <Input id="alt" type="number" value={p.origin.altitudeM ?? ""} onChange={(e) => setOrigin("altitudeM", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="process">Process</Label>
          <Input id="process" value={p.process} onChange={(e) => set("process", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="varietal">Varietal</Label>
          <Input id="varietal" value={p.varietal} onChange={(e) => set("varietal", e.target.value)} />
        </div>
        <fieldset className="md:col-span-3">
          <legend className="mb-1.5 text-sm font-medium">Sustainability</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {SUSTAINABILITY_TAGS.map((t) => (
              <label key={t} className="flex items-center gap-2">
                <input type="checkbox" checked={p.tags.includes(t)} onChange={() => set("tags", toggle(p.tags, t))} className="accent-[var(--moss)]" />
                {TAG_LABELS[t]}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">Grinds offered</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          {GRINDS.map((g) => (
            <label key={g} className="flex items-center gap-2">
              <input type="checkbox" checked={p.grinds.includes(g)} onChange={() => set("grinds", toggle(p.grinds, g))} className="accent-[var(--moss)]" />
              {GRIND_LABELS[g]}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={p.taxable} onChange={(e) => set("taxable", e.target.checked)} className="accent-[var(--moss)]" />
          Taxable (leave off for plain coffee beans, which are zero-rated basic groceries)
        </label>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Sizes & packaging</h2>
          <Button type="button" variant="outline" size="sm" onClick={() =>
            setVariants((vs) => [...vs, { label: "340 g", sizeG: 340, price: "", shipWeightG: 400, sku: "", active: true, bom: defaultBom(340) }])
          }>
            <Plus /> Add size
          </Button>
        </div>
        {variants.map((v, i) => (
          <div key={v.id ?? `new-${i}`} className="rounded-lg border border-border p-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              <div className="flex flex-col gap-1"><Label className="text-xs">Label</Label><Input value={v.label} onChange={(e) => setVariant(i, { label: e.target.value })} /></div>
              <div className="flex flex-col gap-1"><Label className="text-xs">Coffee (g)</Label><Input type="number" value={v.sizeG} onChange={(e) => setVariant(i, { sizeG: Number(e.target.value) })} /></div>
              <div className="flex flex-col gap-1"><Label className="text-xs">Price ($)</Label><Input inputMode="decimal" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} /></div>
              <div className="flex flex-col gap-1"><Label className="text-xs">Ship weight (g)</Label><Input type="number" value={v.shipWeightG} onChange={(e) => setVariant(i, { shipWeightG: Number(e.target.value) })} /></div>
              <div className="flex flex-col gap-1"><Label className="text-xs">SKU</Label><Input value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} /></div>
              <div className="flex items-end gap-2">
                <label className="flex h-8 items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={v.active} onChange={(e) => setVariant(i, { active: e.target.checked })} className="accent-[var(--moss)]" /> Active
                </label>
                {!v.id && (
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove size" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Packaging used per bag</p>
              <div className="flex flex-wrap items-center gap-2">
                {v.bom.map((b, bi) => (
                  <span key={bi} className="flex items-center gap-1 rounded-lg bg-muted py-0.5 pr-1 pl-2 text-xs">
                    {packaging.find((x) => x.id === b.packagingItemId)?.name ?? "?"} × {b.qty}
                    <button type="button" aria-label="Remove" className="rounded px-1 hover:bg-background" onClick={() => setVariant(i, { bom: v.bom.filter((_, k) => k !== bi) })}>×</button>
                  </span>
                ))}
                <select
                  aria-label="Add packaging"
                  className={`${selectClass} h-7 w-auto text-xs`}
                  value=""
                  onChange={(e) => e.target.value && setVariant(i, { bom: [...v.bom, { packagingItemId: e.target.value, qty: 1 }] })}
                >
                  <option value="">+ packaging…</option>
                  {packaging.filter((x) => !v.bom.some((b) => b.packagingItemId === x.id)).map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="flex items-center gap-4">
        <SubmitButton pendingText="Saving…">{id ? "Save changes" : "Create coffee"}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
