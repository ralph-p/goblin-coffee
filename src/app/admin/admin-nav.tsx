"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bean,
  Boxes,
  ClipboardList,
  Flame,
  History,
  LayoutDashboard,
  Mail,
  Package,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/roasting", label: "Roasting", icon: Flame },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/inventory/green", label: "Green coffee", icon: Bean },
  { href: "/admin/inventory/packaging", label: "Packaging", icon: Boxes },
  { href: "/admin/inventory/movements", label: "Stock history", icon: History },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/dev/mailbox", label: "Dev mailbox", icon: Mail },
];

/** Nav with the current page highlighted (reads the URL, so render inside <Suspense>). */
export function AdminNav() {
  return <NavLinks path={usePathname()} />;
}

/** Same links without highlighting; used as the Suspense fallback. */
export function NavLinks({ path = "" }: { path?: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
      {items.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
            )}
          >
            <i.icon className="size-4" />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
