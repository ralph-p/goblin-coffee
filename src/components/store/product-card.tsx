import Link from "next/link";
import { ProductArt } from "@/components/brand/product-art";
import { Badge } from "@/components/ui/badge";
import { ROAST_LABELS, TAG_LABELS } from "@/domain/types";
import { formatCents } from "@/lib/money";
import { storage } from "@/server/adapters/storage";
import type { StorefrontProduct } from "@/server/services/catalog";

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const from = Math.min(...product.variants.filter((v) => v.active).map((v) => v.priceCents));
  const cover = product.images[0];
  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <ProductArt
        roastLevel={product.roastLevel}
        imageUrl={cover ? storage().url(cover.key) : null}
        alt={cover?.alt || product.name}
      />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {product.origin.country} · {ROAST_LABELS[product.roastLevel]}
          </span>
          {product.stock === "roast_to_order" && <span className="text-clay">Roasted to order</span>}
        </div>
        <h3 className="text-xl font-semibold group-hover:text-primary">{product.name}</h3>
        <p className="text-sm text-muted-foreground">{product.tastingNotes.join(" · ")}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          {product.tags.slice(0, 2).map((t) => (
            <Badge key={t} variant="secondary">
              {TAG_LABELS[t]}
            </Badge>
          ))}
          <span className="ml-auto font-medium">from {formatCents(from)}</span>
        </div>
      </div>
    </Link>
  );
}
