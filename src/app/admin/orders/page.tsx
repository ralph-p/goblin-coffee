import Link from "next/link";
import { connection } from "next/server";
import { PageHeader, StatusBadge, table } from "@/components/admin/ui";
import { STATUS_LABELS } from "@/domain/order-status";
import { FULFILLMENT_LABELS, ORDER_STATUSES, type OrderStatus } from "@/domain/types";
import { formatDateTime } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { appCtx } from "@/server/app-context";
import { listOrders } from "@/server/services/orders";

export const metadata = { title: "Orders" };

const tabs: { value: OrderStatus | "open" | "all"; label: string }[] = [
  { value: "open", label: "Open" },
  ...ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
  { value: "all", label: "All" },
];

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await connection();
  const sp = await searchParams;
  const current = (typeof sp.status === "string" ? sp.status : "open") as OrderStatus | "open" | "all";
  const orders = await listOrders(appCtx(), current === "all" ? undefined : current);

  return (
    <main>
      <PageHeader title="Orders" description="Mark e-Transfers paid, then move orders through roasting, packing and delivery." />
      <div className="p-6">
        <nav className="flex flex-wrap gap-1.5" aria-label="Filter orders">
          {tabs.map((t) => (
            <Link
              key={t.value}
              href={`/admin/orders?status=${t.value}`}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                current === t.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className={cn(table.wrap, "mt-6 rounded-xl border border-border bg-card")}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th}>Order</th>
                <th className={table.th}>Customer</th>
                <th className={table.th}>Items</th>
                <th className={table.th}>Delivery</th>
                <th className={table.th}>Status</th>
                <th className={`${table.th} ${table.num}`}>Total</th>
                <th className={table.th}>Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-muted/40">
                  <td className={table.td}>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.number}</Link>
                  </td>
                  <td className={table.td}>
                    {o.customer.name}
                    <span className="block text-xs text-muted-foreground">{o.customer.email}</span>
                  </td>
                  <td className={table.td}>
                    {o.lines.map((l) => (
                      <span key={`${l.variantId}${l.grind}`} className="block">{l.qty} × {l.productName} {l.variantLabel}</span>
                    ))}
                  </td>
                  <td className={table.td}>{FULFILLMENT_LABELS[o.fulfillment.method]}</td>
                  <td className={table.td}><StatusBadge status={o.status} method={o.fulfillment.method} /></td>
                  <td className={`${table.td} ${table.num}`}>{formatCents(o.totals.totalCents)}</td>
                  <td className={`${table.td} whitespace-nowrap text-muted-foreground`}>{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No orders here.</p>}
        </div>
      </div>
    </main>
  );
}
