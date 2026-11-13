import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Panel, PageHeader, StatusBadge, table } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { nextStatuses, statusLabel } from "@/domain/order-status";
import { gramsByProduct } from "@/domain/roasting";
import { FULFILLMENT_LABELS, GRIND_LABELS, type Order, type OrderStatus } from "@/domain/types";
import { centsToInput, formatDate, formatDateTime, formatGrams } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { appCtx } from "@/server/app-context";
import { getOrder } from "@/server/services/orders";
import {
  addNoteAction,
  advanceOrderAction,
  bagReturnedAction,
  cancelOrderAction,
  markPaidAction,
  shipOrderAction,
} from "../../actions";

const verbs: Partial<Record<OrderStatus, string>> = {
  roasting: "Start roasting",
  packed: "Mark packed",
  ready_for_pickup: "Ready for pickup",
  completed: "Mark completed",
};

function Advance({ order, to }: { order: Order; to: OrderStatus }) {
  return (
    <ActionForm action={advanceOrderAction} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={order.id} />
      <input type="hidden" name="to" value={to} />
      <SubmitButton variant={to === "packed" || to === "completed" ? "default" : "outline"} pendingText="Updating…">
        {verbs[to] ?? statusLabel(to, order.fulfillment.method)}
      </SubmitButton>
    </ActionForm>
  );
}

export default async function OrderDetail({ params }: PageProps<"/admin/orders/[id]">) {
  await connection();
  const { id } = await params;
  const ctx = appCtx();
  const order = await getOrder(ctx, id);
  if (!order) notFound();
  const [products, settings] = await Promise.all([ctx.repo.products.all(), ctx.repo.settings.get()]);

  const next = nextStatuses(order).filter((s) => s !== "cancelled" && s !== "paid");
  const canCancel = nextStatuses(order).includes("cancelled");
  const overdue = order.status === "awaiting_payment" && Date.parse(order.paymentDueAt) < ctx.now().getTime();
  const needs = [...gramsByProduct(order)].map(([pid, g]) => {
    const p = products.find((x) => x.id === pid);
    return { name: p?.name ?? pid, needed: g, onHand: p?.roastedOnHandG ?? 0 };
  });
  const showStock = ["paid", "roasting"].includes(order.status);
  const a = order.fulfillment.address;

  return (
    <main>
      <PageHeader
        title={`Order ${order.number}`}
        description={`Placed ${formatDateTime(order.createdAt)} · ${FULFILLMENT_LABELS[order.fulfillment.method]}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} method={order.fulfillment.method} />
            <Link href={`/admin/orders/${order.id}/slip`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Packing slip
            </Link>
          </div>
        }
      />
      <div className="grid gap-6 p-6 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Panel title="Items">
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th}>Coffee</th>
                    <th className={table.th}>Grind</th>
                    <th className={`${table.th} ${table.num}`}>Qty</th>
                    <th className={`${table.th} ${table.num}`}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((l) => (
                    <tr key={`${l.variantId}${l.grind}`}>
                      <td className={table.td}>{l.productName} · {l.variantLabel}</td>
                      <td className={table.td}>{GRIND_LABELS[l.grind]}</td>
                      <td className={`${table.td} ${table.num}`}>{l.qty}</td>
                      <td className={`${table.td} ${table.num}`}>{formatCents(l.unitPriceCents * l.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-3 ml-auto flex max-w-xs flex-col gap-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCents(order.totals.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{formatCents(order.totals.shippingCents)}</dd></div>
              {order.totals.taxCents > 0 && (
                <div className="flex justify-between"><dt>{order.totals.taxLabel}</dt><dd>{formatCents(order.totals.taxCents)}</dd></div>
              )}
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatCents(order.totals.totalCents)}</dd></div>
            </dl>
          </Panel>

          {showStock && (
            <Panel title="Roasted coffee needed">
              <ul className="flex flex-col gap-1.5 text-sm">
                {needs.map((n) => (
                  <li key={n.name} className="flex justify-between">
                    <span>{n.name}</span>
                    <span className={n.onHand >= n.needed ? "text-primary" : "text-clay"}>
                      needs {formatGrams(n.needed)} · {formatGrams(n.onHand)} on shelf
                      {n.onHand < n.needed && " (roast first)"}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Customer">
              <p className="font-medium">{order.customer.name}</p>
              <p className="text-sm"><a className="text-primary hover:underline" href={`mailto:${order.customer.email}`}>{order.customer.email}</a></p>
              {order.customer.phone && <p className="text-sm">{order.customer.phone}</p>}
              {order.customerNote && <p className="mt-3 rounded-lg bg-muted p-3 text-sm">“{order.customerNote}”</p>}
            </Panel>
            <Panel title={FULFILLMENT_LABELS[order.fulfillment.method]}>
              {a ? (
                <address className="text-sm not-italic">
                  {a.line1}{a.line2 && <>, {a.line2}</>}<br />{a.city}, {a.province} {a.postalCode}
                </address>
              ) : (
                <p className="text-sm">{settings.pickup.location}</p>
              )}
              {order.tracking && <p className="mt-2 text-sm">Tracking: {order.tracking.carrier} {order.tracking.number}</p>}
              {order.bagReturn && (
                <p className="mt-2 text-sm text-primary">♻ Bag-return program{order.bagReturned ? " · bags returned" : ""}</p>
              )}
            </Panel>
          </div>

          <Panel title="Timeline">
            <ol className="flex flex-col gap-2 text-sm">
              {[...order.events].reverse().map((e, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-32 shrink-0 text-muted-foreground">{formatDateTime(e.at)}</span>
                  <span>{e.message}</span>
                </li>
              ))}
            </ol>
            <ActionForm action={addNoteAction} className="mt-4 flex flex-col gap-2">
              <input type="hidden" name="id" value={order.id} />
              <div className="flex gap-2">
                <Input name="note" placeholder="Add an internal note…" aria-label="Note" />
                <SubmitButton variant="outline">Add</SubmitButton>
              </div>
            </ActionForm>
          </Panel>
        </div>

        <aside className="flex flex-col gap-6">
          {order.status === "awaiting_payment" && (
            <Panel title="Record e-Transfer">
              <p className="mb-3 text-sm text-muted-foreground">
                Due {formatDate(order.paymentDueAt)}
                {overdue && <span className="text-clay"> · overdue</span>}
                {order.reminderSentAt && ` · reminder sent ${formatDate(order.reminderSentAt)}`}
              </p>
              <ActionForm action={markPaidAction} className="flex flex-col gap-3">
                <input type="hidden" name="id" value={order.id} />
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount">Amount received ($)</Label>
                  <Input id="amount" name="amount" inputMode="decimal" defaultValue={centsToInput(order.totals.totalCents)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reference">Bank reference (optional)</Label>
                  <Input id="reference" name="reference" placeholder="e.g. CA1xYz9" />
                </div>
                <SubmitButton pendingText="Saving…">Mark paid</SubmitButton>
              </ActionForm>
            </Panel>
          )}

          {order.payment && (
            <Panel title="Payment">
              <p className="text-sm">
                {formatCents(order.payment.amountCents)} received {formatDate(order.payment.receivedAt)}
                {order.payment.reference && <> · ref {order.payment.reference}</>}
              </p>
            </Panel>
          )}

          {(next.length > 0 || canCancel) && (
            <Panel title="Next step">
              <div className="flex flex-col gap-3">
                {next.map((to) =>
                  to === "shipped" ? (
                    <ActionForm key={to} action={shipOrderAction} className="flex flex-col gap-2">
                      <input type="hidden" name="id" value={order.id} />
                      {order.fulfillment.method === "ship" && (
                        <div className="grid grid-cols-[1fr_1.4fr] gap-2">
                          <Input name="carrier" defaultValue={order.tracking?.carrier ?? "Canada Post"} aria-label="Carrier" />
                          <Input name="trackingNumber" defaultValue={order.tracking?.number ?? ""} placeholder="Tracking #" aria-label="Tracking number" />
                        </div>
                      )}
                      <SubmitButton pendingText="Updating…">
                        {order.fulfillment.method === "local_delivery" ? "Out for delivery" : "Mark shipped"}
                      </SubmitButton>
                    </ActionForm>
                  ) : (
                    <Advance key={to} order={order} to={to} />
                  ),
                )}
                {canCancel && (
                  <details className="rounded-lg border border-border p-3">
                    <summary className="cursor-pointer text-sm text-destructive">Cancel order…</summary>
                    <ActionForm action={cancelOrderAction} className="mt-3 flex flex-col gap-2">
                      <input type="hidden" name="id" value={order.id} />
                      <Input name="reason" placeholder="Reason (shown to customer)" aria-label="Reason" />
                      {order.payment && (
                        <p className="text-xs text-muted-foreground">
                          Remember to refund {formatCents(order.payment.amountCents)} by e-Transfer.
                        </p>
                      )}
                      <SubmitButton variant="destructive" pendingText="Cancelling…">Cancel and email customer</SubmitButton>
                    </ActionForm>
                  </details>
                )}
              </div>
            </Panel>
          )}

          {order.bagReturn && !order.bagReturned && ["shipped", "ready_for_pickup", "completed"].includes(order.status) && (
            <Panel title="Bag return">
              <ActionForm action={bagReturnedAction} className="flex flex-col gap-2">
                <input type="hidden" name="id" value={order.id} />
                <p className="text-sm text-muted-foreground">Got the empty bags back?</p>
                <SubmitButton variant="outline">Mark bags returned</SubmitButton>
              </ActionForm>
            </Panel>
          )}
        </aside>
      </div>
    </main>
  );
}
