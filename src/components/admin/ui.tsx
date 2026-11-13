import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/domain/order-status";
import type { FulfillmentMethod, OrderStatus } from "@/domain/types";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      {title && (
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "warn" }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", tone === "warn" ? "border-clay/50" : "border-border")}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "warn" && "text-clay")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const statusTone: Record<OrderStatus, string> = {
  awaiting_payment: "bg-[#f3e2c9] text-[#7a4a12] dark:bg-[#4a3518] dark:text-[#f0cf9a]",
  paid: "bg-accent text-accent-foreground",
  roasting: "bg-[#f1d8c8] text-[#8a3f1d] dark:bg-[#4a2a1c] dark:text-[#eab091]",
  packed: "bg-secondary text-secondary-foreground",
  shipped: "bg-primary text-primary-foreground",
  ready_for_pickup: "bg-primary text-primary-foreground",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status, method }: { status: OrderStatus; method?: FulfillmentMethod }) {
  return <Badge className={cn("border-transparent", statusTone[status])}>{statusLabel(status, method)}</Badge>;
}

/** Plain table styling for admin lists (lighter than the shadcn Table for dense data). */
export const table = {
  wrap: "overflow-x-auto",
  table: "w-full text-sm",
  th: "border-b border-border px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap",
  td: "border-b border-border/60 px-3 py-2 align-top",
  num: "text-right tabular-nums",
};
