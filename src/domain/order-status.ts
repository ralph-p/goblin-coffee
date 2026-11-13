import type { FulfillmentMethod, Order, OrderStatus } from "./types";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  roasting: "Roasting",
  packed: "Packed",
  shipped: "Shipped",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Every allowed move. Anything not listed here is rejected. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ["paid", "cancelled"],
  paid: ["roasting", "packed", "cancelled"],
  roasting: ["packed"],
  packed: ["shipped", "ready_for_pickup"],
  shipped: ["completed"],
  ready_for_pickup: ["completed"],
  completed: [],
  cancelled: [],
};

/** Packed orders leave by carrier/delivery or wait for pickup. */
function fitsFulfillment(to: OrderStatus, method: FulfillmentMethod) {
  if (to === "ready_for_pickup") return method === "pickup";
  if (to === "shipped") return method !== "pickup";
  return true;
}

export function nextStatuses(order: Pick<Order, "status" | "fulfillment">): OrderStatus[] {
  return TRANSITIONS[order.status].filter((to) =>
    fitsFulfillment(to, order.fulfillment.method),
  );
}

export function canTransition(
  order: Pick<Order, "status" | "fulfillment">,
  to: OrderStatus,
): boolean {
  return nextStatuses(order).includes(to);
}

/** Display label for "shipped", which means "out for delivery" for local orders. */
export function statusLabel(status: OrderStatus, method?: FulfillmentMethod) {
  if (status === "shipped" && method === "local_delivery") return "Out for delivery";
  return STATUS_LABELS[status];
}

/** Ordered steps shown on the customer timeline. */
export function timelineFor(method: FulfillmentMethod): OrderStatus[] {
  return [
    "awaiting_payment",
    "paid",
    "roasting",
    "packed",
    method === "pickup" ? "ready_for_pickup" : "shipped",
    "completed",
  ];
}
