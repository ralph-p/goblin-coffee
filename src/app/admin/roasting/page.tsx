import Link from "next/link";
import { connection } from "next/server";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Panel, PageHeader, table } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { formatDate, formatGrams } from "@/lib/format";
import { cn } from "@/lib/utils";
import { appCtx } from "@/server/app-context";
import { getRoastQueue, listBatches } from "@/server/services/roasting";
import { adjustRoastedAction } from "../actions";
import { LogBatchForm } from "./log-batch-form";

export const metadata = { title: "Roasting" };

export default async function RoastingPage() {
  await connection();
  const ctx = appCtx();
  const [queue, batches, products, lots] = await Promise.all([
    getRoastQueue(ctx),
    listBatches(ctx),
    ctx.repo.products.all(),
    ctx.repo.greenLots.all(),
  ]);
  const shelf = products.filter((p) => p.status !== "archived").sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main>
      <PageHeader
        title="Roasting"
        description="Paid orders draw from roasted stock first. Anything they can't cover shows up here as a shortfall."
      />
      <div className="grid gap-6 p-6 xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <Panel title="Roast queue">
            {queue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open orders.</p>
            ) : (
              <div className={table.wrap}>
                <table className={table.table}>
                  <thead>
                    <tr>
                      <th className={table.th}>Coffee</th>
                      <th className={`${table.th} ${table.num}`}>Paid demand</th>
                      <th className={`${table.th} ${table.num}`}>On shelf</th>
                      <th className={`${table.th} ${table.num}`}>Shortfall</th>
                      <th className={`${table.th} ${table.num}`}>Green to roast</th>
                      <th className={`${table.th} ${table.num}`}>Awaiting payment</th>
                      <th className={table.th}>Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((r) => (
                      <tr key={r.productId}>
                        <td className={`${table.td} font-medium`}>{r.productName}</td>
                        <td className={`${table.td} ${table.num}`}>{formatGrams(r.demandG)}</td>
                        <td className={`${table.td} ${table.num}`}>{formatGrams(r.onHandG)}</td>
                        <td className={cn(table.td, table.num, r.shortfallG > 0 && "font-semibold text-clay")}>
                          {r.shortfallG > 0 ? formatGrams(r.shortfallG) : "—"}
                        </td>
                        <td className={`${table.td} ${table.num}`} title={`Avg loss ${r.avgLossPct}%`}>
                          {r.suggestedGreenG > 0 ? `≈ ${formatGrams(r.suggestedGreenG)}` : "—"}
                        </td>
                        <td className={`${table.td} ${table.num} text-muted-foreground`}>{r.pendingG ? formatGrams(r.pendingG) : "—"}</td>
                        <td className={`${table.td} text-xs`}>{r.orderNumbers.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Roasted coffee on the shelf">
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th}>Coffee</th>
                    <th className={`${table.th} ${table.num}`}>On shelf</th>
                    <th className={table.th}>Correct after a recount</th>
                  </tr>
                </thead>
                <tbody>
                  {shelf.map((p) => (
                    <tr key={p.id}>
                      <td className={table.td}>{p.name}</td>
                      <td className={`${table.td} ${table.num}`}>{formatGrams(p.roastedOnHandG)}</td>
                      <td className={table.td}>
                        <ActionForm action={adjustRoastedAction} className="flex flex-col gap-1">
                          <input type="hidden" name="id" value={p.id} />
                          <div className="flex gap-2">
                            <Input name="delta" type="number" placeholder="± grams" className="w-28" aria-label="Change in grams" />
                            <Input name="note" placeholder="Why? (sample, spill…)" aria-label="Reason" />
                            <SubmitButton variant="outline" size="sm">Adjust</SubmitButton>
                          </div>
                        </ActionForm>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Roast log">
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th}>Date</th>
                    <th className={table.th}>Coffee</th>
                    <th className={table.th}>Lot</th>
                    <th className={`${table.th} ${table.num}`}>Green</th>
                    <th className={`${table.th} ${table.num}`}>Roasted</th>
                    <th className={`${table.th} ${table.num}`}>Loss</th>
                    <th className={`${table.th} ${table.num}`}>Drop °C</th>
                    <th className={`${table.th} ${table.num}`}>Dev</th>
                    <th className={`${table.th} ${table.num}`}>Cup</th>
                    <th className={table.th}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td className={`${table.td} whitespace-nowrap`}>{formatDate(b.roastedAt)}</td>
                      <td className={table.td}>{b.productName}</td>
                      <td className={table.td}>
                        <Link href="/admin/inventory/green" className="hover:underline">{b.lotCode}</Link>
                      </td>
                      <td className={`${table.td} ${table.num}`}>{formatGrams(b.greenG)}</td>
                      <td className={`${table.td} ${table.num}`}>{formatGrams(b.roastedG)}</td>
                      <td className={`${table.td} ${table.num}`}>{b.lossPct}%</td>
                      <td className={`${table.td} ${table.num}`}>{b.dropTempC ?? "—"}</td>
                      <td className={`${table.td} ${table.num}`}>{b.devTimeS ? `${b.devTimeS}s` : "—"}</td>
                      <td className={`${table.td} ${table.num}`}>{b.cuppingScore ?? "—"}</td>
                      <td className={`${table.td} max-w-64 text-muted-foreground`}>{b.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <aside>
          <Panel title="Log a roast" className="xl:sticky xl:top-6">
            <LogBatchForm
              products={shelf.map((p) => ({ id: p.id, name: p.name, lotId: p.greenLotId }))}
              lots={lots
                .filter((l) => l.remainingG > 0)
                .map((l) => ({ id: l.id, label: `${l.code} · ${l.name}`, remainingG: l.remainingG }))}
              suggestions={Object.fromEntries(queue.filter((r) => r.suggestedGreenG > 0).map((r) => [r.productId, r.suggestedGreenG]))}
            />
          </Panel>
        </aside>
      </div>
    </main>
  );
}
