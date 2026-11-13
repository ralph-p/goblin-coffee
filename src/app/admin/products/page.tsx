import Link from "next/link";
import { connection } from "next/server";
import { ProductArt } from "@/components/brand/product-art";
import { Panel, PageHeader, table } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ROAST_LABELS } from "@/domain/types";
import { formatGrams } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { storage } from "@/server/adapters/storage";
import { appCtx } from "@/server/app-context";
import { listProducts } from "@/server/services/catalog";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  await connection();
  const products = await listProducts(appCtx());

  return (
    <main>
      <PageHeader
        title="Products"
        description="Coffees on the store, their sizes, prices and packaging."
        actions={<Link href="/admin/products/new" className={buttonVariants()}>New coffee</Link>}
      />
      <div className="p-6">
        <Panel>
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Coffee</th>
                  <th className={table.th}>Status</th>
                  <th className={table.th}>Sizes</th>
                  <th className={`${table.th} ${table.num}`}>On shelf</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/40">
                    <td className={table.td}>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <span className="w-12 shrink-0 overflow-hidden rounded-md">
                          <ProductArt roastLevel={p.roastLevel} imageUrl={p.images[0] ? storage().url(p.images[0].key) : null} alt="" />
                        </span>
                        <span>
                          <span className="font-medium text-primary hover:underline">{p.name}</span>
                          <span className="block text-xs text-muted-foreground">{p.origin.country} · {ROAST_LABELS[p.roastLevel]}</span>
                        </span>
                      </Link>
                    </td>
                    <td className={table.td}>
                      <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize">{p.status}</Badge>
                    </td>
                    <td className={table.td}>
                      {p.variants.map((v) => (
                        <span key={v.id} className={`block ${v.active ? "" : "text-muted-foreground line-through"}`}>
                          {v.label} · {formatCents(v.priceCents)}
                        </span>
                      ))}
                    </td>
                    <td className={`${table.td} ${table.num}`}>{formatGrams(p.roastedOnHandG)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </main>
  );
}
