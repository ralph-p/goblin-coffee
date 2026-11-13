import { connection } from "next/server";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Panel, PageHeader, table } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SUSTAINABILITY_TAGS, TAG_LABELS } from "@/domain/types";
import { formatDate, formatGrams } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { appCtx } from "@/server/app-context";
import { listGreenLots } from "@/server/services/inventory";
import { adjustGreenLotAction, createGreenLotAction } from "../../actions";

export const metadata = { title: "Green coffee" };

function Field({ name, label, ...props }: React.ComponentProps<typeof Input> & { name: string; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`lot-${name}`}>{label}</Label>
      <Input id={`lot-${name}`} name={name} {...props} />
    </div>
  );
}

export default async function GreenPage() {
  await connection();
  const ctx = appCtx();
  const [lots, products] = await Promise.all([listGreenLots(ctx), ctx.repo.products.all()]);
  const today = new Date().toLocaleDateString("en-CA");

  return (
    <main>
      <PageHeader title="Green coffee" description="Lots you've bought. Roast batches draw these down automatically." />
      <div className="grid gap-6 p-6 xl:grid-cols-[1fr_360px]">
        <Panel title="Lots">
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Lot</th>
                  <th className={table.th}>Origin</th>
                  <th className={table.th}>Used for</th>
                  <th className={`${table.th} ${table.num}`}>Cost/kg</th>
                  <th className={`${table.th} ${table.num}`}>Remaining</th>
                  <th className={table.th}>Adjust</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((l) => {
                  const pct = Math.round((l.remainingG / l.receivedG) * 100);
                  return (
                    <tr key={l.id}>
                      <td className={table.td}>
                        <span className="font-medium">{l.code}</span>
                        <span className="block text-xs text-muted-foreground">{l.name} · {l.supplier}</span>
                        <span className="block text-xs text-muted-foreground">Arrived {formatDate(l.arrivedAt)}</span>
                      </td>
                      <td className={table.td}>
                        {l.origin.region}, {l.origin.country}
                        <span className="block text-xs text-muted-foreground">{l.process} · {l.varietal}</span>
                        {l.certifications.length > 0 && (
                          <span className="block text-xs text-primary">{l.certifications.map((c) => TAG_LABELS[c]).join(" · ")}</span>
                        )}
                      </td>
                      <td className={`${table.td} text-xs`}>
                        {products.filter((p) => p.greenLotId === l.id).map((p) => p.name).join(", ") || "—"}
                      </td>
                      <td className={`${table.td} ${table.num}`}>{formatCents(l.costPerKgCents)}</td>
                      <td className={`${table.td} ${table.num}`}>
                        <span className={pct < 30 ? "font-semibold text-clay" : ""}>{formatGrams(l.remainingG)}</span>
                        <span className="block text-xs text-muted-foreground">of {formatGrams(l.receivedG)}</span>
                        <span className="mt-1 block h-1.5 w-full rounded-full bg-muted">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </span>
                      </td>
                      <td className={table.td}>
                        <ActionForm action={adjustGreenLotAction} className="flex flex-col gap-1">
                          <input type="hidden" name="id" value={l.id} />
                          <div className="flex gap-1.5">
                            <Input name="delta" type="number" placeholder="± g" className="w-24" aria-label="Change in grams" />
                            <Input name="note" placeholder="Reason" className="w-28" aria-label="Reason" />
                            <SubmitButton variant="outline" size="sm">Save</SubmitButton>
                          </div>
                        </ActionForm>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Receive a new lot">
          <ActionForm action={createGreenLotAction} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field name="code" label="Lot code" placeholder="PER-26-01" required />
              <Field name="receivedKg" label="Received (kg)" type="number" step="0.1" min={0.1} required />
            </div>
            <Field name="name" label="Name" placeholder="Cajamarca washed" required />
            <Field name="supplier" label="Supplier / importer" />
            <div className="grid grid-cols-2 gap-3">
              <Field name="country" label="Country" required />
              <Field name="region" label="Region" />
            </div>
            <Field name="producer" label="Producer / co-op" />
            <div className="grid grid-cols-2 gap-3">
              <Field name="process" label="Process" placeholder="Washed" />
              <Field name="varietal" label="Varietal" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field name="costPerKg" label="Cost per kg ($)" inputMode="decimal" placeholder="12.50" required />
              <Field name="arrivedAt" label="Arrived" type="date" defaultValue={today} required />
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Certifications</legend>
              <div className="grid grid-cols-2 gap-1.5 text-sm">
                {SUSTAINABILITY_TAGS.map((t) => (
                  <label key={t} className="flex items-center gap-2">
                    <input type="checkbox" name="certifications" value={t} className="accent-[var(--moss)]" />
                    {TAG_LABELS[t]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lot-notes">Notes</Label>
              <Textarea id="lot-notes" name="notes" rows={2} />
            </div>
            <SubmitButton>Receive lot</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </main>
  );
}
