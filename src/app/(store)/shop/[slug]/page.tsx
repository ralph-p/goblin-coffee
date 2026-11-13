import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CalendarDays, MapPin, Mountain, Sprout } from "lucide-react";
import { ProductArt } from "@/components/brand/product-art";
import { Badge } from "@/components/ui/badge";
import { ROAST_LABELS, TAG_LABELS } from "@/domain/types";
import { formatDate } from "@/lib/format";
import { storage } from "@/server/adapters/storage";
import { appCtx } from "@/server/app-context";
import { getStorefrontProduct } from "@/server/services/catalog";
import { AddToCart } from "./add-to-cart";

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  await connection();
  const { slug } = await params;
  const product = await getStorefrontProduct(appCtx(), slug);
  if (!product) notFound();

  const images = product.images.map((i) => ({ ...i, url: storage().url(i.key) }));
  const variants = product.variants.filter((v) => v.active);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <Link href="/shop" className="text-sm text-muted-foreground hover:text-foreground">
        ← All coffees
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-3xl border border-border">
            <ProductArt roastLevel={product.roastLevel} imageUrl={images[0]?.url} alt={images[0]?.alt || product.name} />
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.slice(1).map((i) => (
                <div key={i.key} className="overflow-hidden rounded-xl border border-border">
                  <ProductArt roastLevel={product.roastLevel} imageUrl={i.url} alt={i.alt || product.name} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-medium tracking-wide text-clay uppercase">
              {product.origin.country} · {ROAST_LABELS[product.roastLevel]} roast
            </p>
            <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{product.name}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{product.tagline}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {product.tastingNotes.map((n) => (
              <span key={n} className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
                {n}
              </span>
            ))}
          </div>

          <p className="leading-relaxed">{product.description}</p>

          <div className="rounded-2xl border border-border bg-card p-5">
            <AddToCart
              variants={variants.map((v) => ({ id: v.id, label: v.label, priceCents: v.priceCents }))}
              grinds={product.grinds}
            />
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              {product.stock === "in_stock"
                ? product.lastRoastedAt
                  ? `Roasted on ${formatDate(product.lastRoastedAt)}, ready to go out.`
                  : "Ready to go out."
                : "Freshly roasted to order. Ships within about 3 days of payment."}
            </p>
          </div>

          <section className="rounded-2xl border border-border bg-secondary/50 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Sprout className="size-5 text-primary" /> Where it comes from
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Producer</dt>
                <dd>{product.lot?.origin.producer || product.origin.producer || "—"}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-muted-foreground"><MapPin className="size-3.5" /> Region</dt>
                <dd>{product.origin.region}, {product.origin.country}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Process</dt>
                <dd>{product.process}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Varietal</dt>
                <dd>{product.varietal}</dd>
              </div>
              {product.origin.altitudeM && (
                <div>
                  <dt className="flex items-center gap-1 text-muted-foreground"><Mountain className="size-3.5" /> Altitude</dt>
                  <dd>{product.origin.altitudeM.toLocaleString()} m</dd>
                </div>
              )}
              {product.lot && (
                <div>
                  <dt className="text-muted-foreground">Lot</dt>
                  <dd>{product.lot.code}</dd>
                </div>
              )}
            </dl>
            {product.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {product.tags.map((t) => (
                  <Badge key={t} variant="outline">{TAG_LABELS[t]}</Badge>
                ))}
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              Packed in a compostable bag. Join the bag-return program at checkout and we&apos;ll collect your
              empties.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
