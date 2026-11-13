import Link from "next/link";
import { Suspense } from "react";
import { ShoppingBag } from "lucide-react";
import { GoblinMark } from "@/components/brand/goblin-mark";
import { readCart } from "@/server/cart-cookie";

async function CartCount() {
  const count = (await readCart()).reduce((s, l) => s + l.qty, 0);
  return count > 0 ? (
    <span className="ml-1 rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
      {count}
    </span>
  ) : null;
}

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-heading text-xl font-semibold">
            <GoblinMark className="size-7 text-primary" />
            Goblin Coffee
          </Link>
          <nav className="flex items-center gap-1 text-sm sm:gap-4">
            <Link href="/shop" className="rounded-md px-2 py-1 hover:bg-muted">
              Shop
            </Link>
            <Link href="/cart" className="flex items-center rounded-md px-2 py-1 hover:bg-muted" aria-label="Cart">
              <ShoppingBag className="size-5" />
              <Suspense fallback={null}>
                <CartCount />
              </Suspense>
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="border-t border-border bg-secondary/40">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 text-sm text-muted-foreground sm:grid-cols-3">
          <div>
            <p className="font-heading text-base text-foreground">Goblin Coffee</p>
            <p className="mt-1">Small-batch coffee, roasted with nature in mind.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">How it works</p>
            <p className="mt-1">Order online, pay by Interac e-Transfer, and we roast and send it out fresh.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Lighter footprint</p>
            <p className="mt-1">Compostable bags, recycled mailers, and a bag-return program.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
