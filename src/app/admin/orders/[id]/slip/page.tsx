import { notFound } from "next/navigation";
import { connection } from "next/server";
import { GoblinMark } from "@/components/brand/goblin-mark";
import { PrintButton } from "@/components/print-button";
import { FULFILLMENT_LABELS, GRIND_LABELS } from "@/domain/types";
import { formatDate } from "@/lib/format";
import { appCtx } from "@/server/app-context";
import { getOrder } from "@/server/services/orders";

export const metadata = { title: "Packing slip" };

export default async function PackingSlip({ params }: PageProps<"/admin/orders/[id]/slip">) {
  await connection();
  const { id } = await params;
  const ctx = appCtx();
  const order = await getOrder(ctx, id);
  if (!order) notFound();
  const settings = await ctx.repo.settings.get();
  const a = order.fulfillment.address;

  return (
    <main className="mx-auto max-w-2xl bg-white p-8 text-black print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <header className="flex items-start justify-between border-b border-black/20 pb-4">
        <div className="flex items-center gap-2">
          <GoblinMark className="size-8" />
          <div>
            <p className="font-heading text-xl font-semibold">Goblin Coffee</p>
            <p className="text-xs">Small-batch coffee, roasted with nature in mind</p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="text-lg font-semibold">{order.number}</p>
          <p>{formatDate(order.createdAt)}</p>
          <p>{FULFILLMENT_LABELS[order.fulfillment.method]}</p>
        </div>
      </header>
      <section className="mt-6 text-sm">
        <p className="font-semibold">{order.customer.name}</p>
        {a ? (
          <p>{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}, {a.province} {a.postalCode}</p>
        ) : (
          <p>Pickup at {settings.pickup.location}</p>
        )}
      </section>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-black/20 text-left">
            <th className="py-2">✓</th>
            <th className="py-2">Coffee</th>
            <th className="py-2">Size</th>
            <th className="py-2">Grind</th>
            <th className="py-2 text-right">Qty</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((l) => (
            <tr key={`${l.variantId}${l.grind}`} className="border-b border-black/10">
              <td className="py-2">☐</td>
              <td className="py-2">{l.productName}</td>
              <td className="py-2">{l.variantLabel}</td>
              <td className="py-2">{GRIND_LABELS[l.grind]}</td>
              <td className="py-2 text-right">{l.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {order.customerNote && <p className="mt-6 text-sm">Customer note: “{order.customerNote}”</p>}
      <footer className="mt-10 border-t border-black/20 pt-4 text-xs">
        <p>Your bag is compostable: remove the valve and label first.</p>
        {order.bagReturn && <p className="mt-1 font-semibold">♻ Bag-return member: please collect empties next visit.</p>}
        <p className="mt-1">Thank you for supporting small-batch, sustainably sourced coffee.</p>
      </footer>
    </main>
  );
}
