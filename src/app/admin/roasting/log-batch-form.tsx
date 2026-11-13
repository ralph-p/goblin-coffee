"use client";

import { useActionState, useState } from "react";
import { FormMessage, selectClass, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { lossPct } from "@/domain/roasting";
import { formatGrams } from "@/lib/format";
import { logBatchAction } from "../actions";

interface Props {
  products: { id: string; name: string; lotId: string | null }[];
  lots: { id: string; label: string; remainingG: number }[];
  suggestions: Record<string, number>;
}

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

export function LogBatchForm({ products, lots, suggestions }: Props) {
  const [state, action] = useActionState(logBatchAction, { ok: false });
  const first = products.find((p) => suggestions[p.id]) ?? products[0];
  const [productId, setProductId] = useState(first?.id ?? "");
  const [lotId, setLotId] = useState(first?.lotId ?? lots[0]?.id ?? "");
  const [greenG, setGreenG] = useState(String(suggestions[first?.id ?? ""] ?? ""));
  const [roastedG, setRoastedG] = useState("");

  const g = Number(greenG);
  const r = Number(roastedG);
  const loss = g > 0 && r > 0 ? lossPct(g, r) : null;
  const lot = lots.find((l) => l.id === lotId);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="productId">Coffee</Label>
        <select
          id="productId"
          name="productId"
          className={selectClass}
          value={productId}
          onChange={(e) => {
            const p = products.find((x) => x.id === e.target.value);
            setProductId(e.target.value);
            if (p?.lotId) setLotId(p.lotId);
            if (suggestions[e.target.value]) setGreenG(String(suggestions[e.target.value]));
          }}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lotId">Green lot</Label>
        <select id="lotId" name="lotId" className={selectClass} value={lotId} onChange={(e) => setLotId(e.target.value)}>
          {lots.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
        {lot && <p className="text-xs text-muted-foreground">{formatGrams(lot.remainingG)} green left</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="roastedAt">Roast date</Label>
        <Input id="roastedAt" name="roastedAt" type="date" defaultValue={today()} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="greenG">Green in (g)</Label>
          <Input id="greenG" name="greenG" type="number" min={1} value={greenG} onChange={(e) => setGreenG(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="roastedG">Roasted out (g)</Label>
          <Input id="roastedG" name="roastedG" type="number" min={1} value={roastedG} onChange={(e) => setRoastedG(e.target.value)} required />
        </div>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {loss === null ? "Weight loss shows here." : `Weight loss: ${loss}%${loss < 11 || loss > 20 ? " (unusual, double-check)" : ""}`}
      </p>
      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer text-sm">Profile & cupping (optional)</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5"><Label htmlFor="chargeTempC">Charge °C</Label><Input id="chargeTempC" name="chargeTempC" type="number" step="0.1" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="dropTempC">Drop °C</Label><Input id="dropTempC" name="dropTempC" type="number" step="0.1" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="totalTimeS">Total time (s)</Label><Input id="totalTimeS" name="totalTimeS" type="number" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="devTimeS">Development (s)</Label><Input id="devTimeS" name="devTimeS" type="number" /></div>
          <div className="col-span-2 flex flex-col gap-1.5"><Label htmlFor="cuppingScore">Cupping score</Label><Input id="cuppingScore" name="cuppingScore" type="number" step="0.25" min={0} max={100} /></div>
        </div>
      </details>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} placeholder="First crack at 8:40, very even colour…" />
      </div>
      <SubmitButton pendingText="Logging…">Log batch</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
