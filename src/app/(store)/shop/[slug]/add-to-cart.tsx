"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormMessage, selectClass, SubmitButton } from "@/components/forms";
import { Label } from "@/components/ui/label";
import { GRIND_LABELS, type Grind } from "@/domain/types";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { addToCartAction } from "../../actions";

interface Props {
  variants: { id: string; label: string; priceCents: number }[];
  grinds: Grind[];
}

export function AddToCart({ variants, grinds }: Props) {
  const [state, action] = useActionState(addToCartAction, { ok: false });
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const price = variants.find((v) => v.id === variantId)?.priceCents ?? 0;

  return (
    <form action={action} className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Size</legend>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <label
              key={v.id}
              className={cn(
                "cursor-pointer rounded-xl border px-4 py-2 text-sm transition has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                variantId === v.id ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name="variantId"
                value={v.id}
                checked={variantId === v.id}
                onChange={() => setVariantId(v.id)}
                className="sr-only"
              />
              <span className="font-medium">{v.label}</span>
              <span className="ml-2 text-muted-foreground">{formatCents(v.priceCents)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grind">Grind</Label>
          <select id="grind" name="grind" className={selectClass} defaultValue={grinds[0]}>
            {grinds.map((g) => (
              <option key={g} value={g}>
                {GRIND_LABELS[g]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="qty">Qty</Label>
          <input
            id="qty"
            name="qty"
            type="number"
            min={1}
            max={20}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className={cn(selectClass, "w-20")}
          />
        </div>
      </div>

      <SubmitButton size="lg" pendingText="Adding…" className="h-11 text-base">
        Add to cart · {formatCents(price * qty)}
      </SubmitButton>
      {state.ok ? (
        <p role="status" className="text-sm text-primary">
          {state.message}{" "}
          <Link href="/cart" className="font-medium underline underline-offset-4">
            View cart
          </Link>
        </p>
      ) : (
        <FormMessage state={state} />
      )}
    </form>
  );
}
