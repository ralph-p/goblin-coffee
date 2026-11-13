import Link from "next/link";
import { GoblinMark } from "@/components/brand/goblin-mark";
import { Suspense } from "react";
import { AdminNav, NavLinks } from "./admin-nav";

export const metadata = { title: { default: "Admin", template: "%s · Goblin Admin" }, robots: { index: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="print:hidden border-b border-sidebar-border bg-sidebar md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <Link href="/admin" className="flex items-center gap-2 font-heading text-lg font-semibold">
            <GoblinMark className="size-6 text-primary" />
            Roastery
          </Link>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
            View store ↗
          </Link>
        </div>
        <Suspense fallback={<NavLinks />}>
          <AdminNav />
        </Suspense>
        <p className="hidden px-4 py-4 text-xs text-muted-foreground md:block">
          Dev mode: data is in memory (saved to .data/). Emails go to the dev mailbox.
        </p>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
