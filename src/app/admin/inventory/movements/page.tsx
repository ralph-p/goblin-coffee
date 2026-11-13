import { connection } from "next/server";
import { Panel, PageHeader, table } from "@/components/admin/ui";
import { formatDateTime, formatGrams } from "@/lib/format";
import { cn } from "@/lib/utils";
import { appCtx } from "@/server/app-context";
import { listMovements } from "@/server/services/movements";

export const metadata = { title: "Stock history" };

const reasons = {
  received: "Received",
  roast_batch: "Roast batch",
  order_packed: "Order packed",
  adjustment: "Adjustment",
  bag_return: "Bag return",
} as const;

export default async function MovementsPage() {
  await connection();
  const movements = await listMovements(appCtx().repo);

  return (
    <main>
      <PageHeader title="Stock history" description="Every change to green, roasted and packaging stock, newest first." />
      <div className="p-6">
        <Panel>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing yet. Log a roast, pack an order or receive stock and it shows up here.
            </p>
          ) : (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th}>When</th>
                    <th className={table.th}>Stock</th>
                    <th className={table.th}>Item</th>
                    <th className={table.th}>Why</th>
                    <th className={`${table.th} ${table.num}`}>Change</th>
                    <th className={table.th}>Ref</th>
                    <th className={table.th}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className={`${table.td} whitespace-nowrap text-muted-foreground`}>{formatDateTime(m.at)}</td>
                      <td className={`${table.td} capitalize`}>{m.kind.replace("_", " ")}</td>
                      <td className={table.td}>{m.itemName}</td>
                      <td className={table.td}>{reasons[m.reason]}</td>
                      <td className={cn(table.td, table.num, m.delta < 0 ? "text-clay" : "text-primary")}>
                        {m.delta > 0 ? "+" : ""}
                        {m.unit === "g" ? formatGrams(m.delta) : m.delta}
                      </td>
                      <td className={`${table.td} text-xs`}>{m.ref ?? "—"}</td>
                      <td className={`${table.td} text-muted-foreground`}>{m.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </main>
  );
}
