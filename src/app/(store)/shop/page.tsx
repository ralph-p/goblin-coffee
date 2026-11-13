import Link from "next/link";
import { connection } from "next/server";
import { ProductCard } from "@/components/store/product-card";
import { ROAST_LABELS, ROAST_LEVELS, type RoastLevel } from "@/domain/types";
import { cn } from "@/lib/utils";
import { appCtx } from "@/server/app-context";
import { listStorefrontProducts } from "@/server/services/catalog";

export const metadata = { title: "Shop" };

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  await connection();
  const sp = await searchParams;
  const roast = typeof sp.roast === "string" ? (sp.roast as RoastLevel) : null;
  const all = await listStorefrontProducts(appCtx());
  const products = roast ? all.filter((p) => p.roastLevel === roast) : all;
  const levels = ROAST_LEVELS.filter((l) => all.some((p) => p.roastLevel === l));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-semibold">Our coffees</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Each one is traceable to the farm or co-op that grew it, roasted in small batches, and packed in
        compostable bags.
      </p>
      <div className="mt-6 flex flex-wrap gap-2" aria-label="Filter by roast">
        <Chip href="/shop" active={!roast}>All</Chip>
        {levels.map((l) => (
          <Chip key={l} href={`/shop?roast=${l}`} active={roast === l}>
            {ROAST_LABELS[l]}
          </Chip>
        ))}
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {products.length === 0 && <p className="mt-8 text-muted-foreground">No coffees match that filter.</p>}
    </main>
  );
}
