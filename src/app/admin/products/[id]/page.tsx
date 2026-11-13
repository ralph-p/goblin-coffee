import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Panel, PageHeader } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import type { ProductInput } from "@/domain/schemas";
import { formatGrams } from "@/lib/format";
import { storage } from "@/server/adapters/storage";
import { appCtx } from "@/server/app-context";
import { getProduct } from "@/server/services/catalog";
import { coverImageAction, removeImageAction, uploadImageAction } from "../../actions";
import { ProductForm } from "../product-form";

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await connection();
  const { id } = await params;
  const ctx = appCtx();
  const product = await getProduct(ctx, id);
  if (!product) notFound();
  const [lots, packaging] = await Promise.all([ctx.repo.greenLots.all(), ctx.repo.packaging.all()]);

  const initial: ProductInput = {
    name: product.name,
    slug: product.slug,
    tagline: product.tagline,
    description: product.description,
    status: product.status,
    origin: product.origin,
    process: product.process,
    varietal: product.varietal,
    roastLevel: product.roastLevel,
    tastingNotes: product.tastingNotes,
    tags: product.tags,
    greenLotId: product.greenLotId,
    grinds: product.grinds,
    taxable: product.taxable,
    variants: product.variants,
  };

  return (
    <main>
      <PageHeader
        title={product.name}
        description={`${formatGrams(product.roastedOnHandG)} roasted on the shelf`}
        actions={
          product.status === "active" ? (
            <Link href={`/shop/${product.slug}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              View on store ↗
            </Link>
          ) : null
        }
      />
      <div className="grid gap-6 p-6 2xl:grid-cols-[1fr_340px]">
        <ProductForm
          id={product.id}
          initial={initial}
          lots={lots.map((l) => ({ id: l.id, label: `${l.code} · ${l.name}` }))}
          packaging={packaging.map((x) => ({ id: x.id, name: x.name }))}
        />
        <aside>
          <Panel title="Photos">
            <div className="grid grid-cols-2 gap-3">
              {product.images.map((img, i) => (
                <figure key={img.key} className="flex flex-col gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local dev/S3 URLs */}
                  <img src={storage().url(img.key)} alt={img.alt} className="aspect-square w-full rounded-lg object-cover" />
                  <figcaption className="flex flex-wrap gap-1 text-xs">
                    {i === 0 ? (
                      <span className="rounded bg-primary px-1.5 text-primary-foreground">Cover</span>
                    ) : (
                      <ActionForm action={coverImageAction}>
                        <input type="hidden" name="id" value={product.id} />
                        <input type="hidden" name="key" value={img.key} />
                        <SubmitButton variant="ghost" size="xs">Make cover</SubmitButton>
                      </ActionForm>
                    )}
                    <ActionForm action={removeImageAction}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="key" value={img.key} />
                      <SubmitButton variant="ghost" size="xs">Remove</SubmitButton>
                    </ActionForm>
                  </figcaption>
                </figure>
              ))}
            </div>
            {product.images.length === 0 && (
              <p className="text-sm text-muted-foreground">No photos yet. The store shows a placeholder.</p>
            )}
            <ActionForm action={uploadImageAction} className="mt-4 flex flex-col gap-2">
              <input type="hidden" name="id" value={product.id} />
              <Input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Image file" />
              <Input name="alt" placeholder="Describe the photo (alt text)" aria-label="Alt text" />
              <SubmitButton variant="outline" pendingText="Uploading…">Upload photo</SubmitButton>
            </ActionForm>
          </Panel>
        </aside>
      </div>
    </main>
  );
}
