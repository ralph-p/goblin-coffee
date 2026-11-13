import Link from "next/link";
import { connection } from "next/server";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Panel, PageHeader, Stat, StatusBadge, table } from "@/components/admin/ui";
import { formatDateTime, formatGrams } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { appCtx } from "@/server/app-context";
import { getDashboard } from "@/server/services/dashboard";
import { runJobAction } from "./actions";

export const metadata = { title: "Dashboard" };

export default async function AdminHome() {
  await connection();
  const d = await getDashboard(appCtx());

  return (
    <main>
      <PageHeader title="Roastery dashboard" description="What needs your attention today." />
      <div className="flex flex-col gap-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Stat
            label="Awaiting e-Transfer"
            value={d.awaitingCount}
            hint={`${formatCents(d.awaitingCents)} outstanding${d.overdueCount ? ` · ${d.overdueCount} overdue` : ""}`}
            tone={d.overdueCount ? "warn" : undefined}
          />
          <Stat label="To roast" value={formatGrams(d.roastShortfallG)} hint="Shortfall for paid orders" tone={d.roastShortfallG ? "warn" : undefined} />
          <Stat label="To pack" value={d.toPack} hint="Paid or roasting" />
          <Stat label="Ready to send" value={d.toShip} hint="Packed, not yet shipped or picked up" />
          <Stat label="Bags returned" value={d.bagsReturned} hint="Kept out of landfill ♻" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <Panel title="Recent orders" actions={<Link href="/admin/orders" className="text-sm text-primary hover:underline">All orders</Link>}>
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th}>Order</th>
                    <th className={table.th}>Customer</th>
                    <th className={table.th}>Status</th>
                    <th className={`${table.th} ${table.num}`}>Total</th>
                    <th className={table.th}>Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recent.map((o) => (
                    <tr key={o.id}>
                      <td className={table.td}>
                        <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.number}</Link>
                      </td>
                      <td className={table.td}>{o.customer.name}</td>
                      <td className={table.td}><StatusBadge status={o.status} method={o.fulfillment.method} /></td>
                      <td className={`${table.td} ${table.num}`}>{formatCents(o.totals.totalCents)}</td>
                      <td className={`${table.td} text-muted-foreground`}>{formatDateTime(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="flex flex-col gap-6">
            <Panel title="Roast next" actions={<Link href="/admin/roasting" className="text-sm text-primary hover:underline">Roasting</Link>}>
              {d.queue.length === 0 ? (
                <p className="text-sm text-muted-foreground">Shelf covers all paid orders. 🌿</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {d.queue.map((r) => (
                    <li key={r.productId} className="flex justify-between gap-2">
                      <span>{r.productName}</span>
                      <span className="text-muted-foreground">
                        {formatGrams(r.shortfallG)} roasted ≈ {formatGrams(r.suggestedGreenG)} green
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Low stock">
              {d.lowPackaging.length === 0 && d.lowGreen.length === 0 ? (
                <p className="text-sm text-muted-foreground">Everything is above its reorder point.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {d.lowPackaging.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2">
                      <Link href="/admin/inventory/packaging" className="hover:underline">{p.name}</Link>
                      <span className="text-clay">{p.onHand} left (reorder at {p.reorderAt})</span>
                    </li>
                  ))}
                  {d.lowGreen.map((l) => (
                    <li key={l.id} className="flex justify-between gap-2">
                      <Link href="/admin/inventory/green" className="hover:underline">{l.code} green</Link>
                      <span className="text-clay">{formatGrams(l.remainingG)} left</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Scheduled jobs">
              <p className="mb-3 text-xs text-muted-foreground">
                In production a scheduler calls these via /api/cron/*. Run them by hand here.
              </p>
              <div className="flex flex-col gap-3">
                <ActionForm action={runJobAction} className="flex flex-col gap-1">
                  <input type="hidden" name="job" value="payment-reminders" />
                  <SubmitButton variant="outline" size="sm" pendingText="Running…">Send payment reminders</SubmitButton>
                </ActionForm>
                <ActionForm action={runJobAction} className="flex flex-col gap-1">
                  <input type="hidden" name="job" value="cancel-unpaid" />
                  <SubmitButton variant="outline" size="sm" pendingText="Running…">Cancel overdue unpaid orders</SubmitButton>
                </ActionForm>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}
