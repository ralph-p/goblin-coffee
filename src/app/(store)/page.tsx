import Link from "next/link";
import { connection } from "next/server";
import { Leaf, Recycle, Sprout } from "lucide-react";
import { GoblinMark } from "@/components/brand/goblin-mark";
import { ProductCard } from "@/components/store/product-card";
import { buttonVariants } from "@/components/ui/button";
import { appCtx } from "@/server/app-context";
import { listStorefrontProducts } from "@/server/services/catalog";

const pillars = [
  {
    icon: Sprout,
    title: "Sourced with care",
    body: "Every lot is traceable to the farm or co-op that grew it, so you know where your cup comes from and who it supports.",
  },
  {
    icon: Leaf,
    title: "Roasted small, roasted fresh",
    body: "Small batches, roasted to order. Every bag shows its roast date.",
  },
  {
    icon: Recycle,
    title: "Lighter on the land",
    body: "Compostable bags, recycled mailers, a bag-return program, and local pickup to keep the footprint small.",
  },
];

export default async function HomePage() {
  await connection();
  const products = await listStorefrontProducts(appCtx());

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-24">
        <GoblinMark className="size-16 text-primary" />
        <p className="text-sm font-medium tracking-[0.2em] text-clay uppercase">Small-batch coffee roaster</p>
        <h1 className="max-w-3xl text-4xl font-semibold text-balance sm:text-6xl">
          Coffee from the forest floor up
        </h1>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">
          Sustainably sourced and roasted in small batches. Pay by Interac e-Transfer, then pick up
          locally or get it shipped across Canada.
        </p>
        <Link href="/shop" className={buttonVariants({ size: "lg", className: "px-6" })}>
          Shop coffee
        </Link>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <h2 className="mb-6 text-2xl font-semibold">On the roaster now</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-secondary/60">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-16 sm:grid-cols-3">
          {pillars.map((p) => (
            <article key={p.title} className="rounded-2xl border border-border bg-card p-6">
              <p.icon className="size-6 text-primary" />
              <h2 className="mt-3 text-xl font-semibold">{p.title}</h2>
              <p className="mt-2 text-muted-foreground">{p.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
