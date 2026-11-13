/**
 * Core domain types. Plain serializable data (ISO date strings, integer cents,
 * grams) so the same shapes work in the memory repo, JSON snapshots, client
 * components and, later, Drizzle rows.
 */
import type { ProvinceCode } from "./provinces";

export type Id = string;
export type ISODate = string;

// ── Catalog ────────────────────────────────────────────────────────────────

export const GRINDS = [
  "whole_bean",
  "espresso",
  "pour_over",
  "drip",
  "french_press",
] as const;
export type Grind = (typeof GRINDS)[number];
export const GRIND_LABELS: Record<Grind, string> = {
  whole_bean: "Whole bean",
  espresso: "Espresso",
  pour_over: "Pour over",
  drip: "Drip",
  french_press: "French press",
};

export const ROAST_LEVELS = ["light", "medium", "medium_dark", "dark"] as const;
export type RoastLevel = (typeof ROAST_LEVELS)[number];
export const ROAST_LABELS: Record<RoastLevel, string> = {
  light: "Light",
  medium: "Medium",
  medium_dark: "Medium-dark",
  dark: "Dark",
};

export const SUSTAINABILITY_TAGS = [
  "organic",
  "direct_trade",
  "fair_trade",
  "women_producers",
  "shade_grown",
  "rainforest_alliance",
] as const;
export type SustainabilityTag = (typeof SUSTAINABILITY_TAGS)[number];
export const TAG_LABELS: Record<SustainabilityTag, string> = {
  organic: "Organic",
  direct_trade: "Direct trade",
  fair_trade: "Fair trade",
  women_producers: "Women producers",
  shade_grown: "Shade grown",
  rainforest_alliance: "Rainforest Alliance",
};

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** Packaging consumed when one unit of a variant is packed. */
export interface BomLine {
  packagingItemId: Id;
  qty: number;
}

export interface Variant {
  id: Id;
  label: string; // "340 g"
  sizeG: number; // roasted coffee in the bag
  priceCents: number;
  shipWeightG: number; // coffee + packaging, for shipping bands
  sku: string;
  active: boolean;
  bom: BomLine[];
}

export interface ProductImage {
  key: string; // storage key
  alt: string;
}

export interface Product {
  id: Id;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  status: ProductStatus;
  origin: {
    country: string;
    region: string;
    producer: string;
    altitudeM: number | null;
  };
  process: string;
  varietal: string;
  roastLevel: RoastLevel;
  tastingNotes: string[];
  tags: SustainabilityTag[];
  /** Green lot currently used for this coffee; drives the sourcing story. */
  greenLotId: Id | null;
  images: ProductImage[];
  grinds: Grind[];
  variants: Variant[];
  /**
   * Plain coffee beans are zero-rated basic groceries for GST/HST in Canada,
   * so coffee defaults to false. Merch/equipment would be true.
   */
  taxable: boolean;
  /** Roasted coffee on the shelf, not yet packed into orders. */
  roastedOnHandG: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ── Orders ─────────────────────────────────────────────────────────────────

export const ORDER_STATUSES = [
  "awaiting_payment",
  "paid",
  "roasting",
  "packed",
  "shipped",
  "ready_for_pickup",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const FULFILLMENT_METHODS = ["ship", "local_delivery", "pickup"] as const;
export type FulfillmentMethod = (typeof FULFILLMENT_METHODS)[number];
export const FULFILLMENT_LABELS: Record<FulfillmentMethod, string> = {
  ship: "Ship it",
  local_delivery: "Local delivery",
  pickup: "Pickup",
};

export interface Address {
  line1: string;
  line2: string;
  city: string;
  province: ProvinceCode;
  postalCode: string;
}

export interface OrderLine {
  productId: Id;
  variantId: Id;
  productName: string;
  variantLabel: string;
  grind: Grind;
  qty: number;
  unitPriceCents: number;
  sizeG: number;
}

export interface Totals {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  taxLabel: string | null;
  totalCents: number;
}

export type OrderEventType =
  | "created"
  | "status"
  | "payment"
  | "email"
  | "tracking"
  | "bag_return"
  | "note";

export interface OrderEvent {
  at: ISODate;
  type: OrderEventType;
  message: string;
}

export interface Order {
  id: Id;
  number: string; // GC-1001
  accessToken: string; // lets a guest view their order
  status: OrderStatus;
  customer: { name: string; email: string; phone: string };
  fulfillment: { method: FulfillmentMethod; address: Address | null };
  lines: OrderLine[];
  totals: Totals;
  customerNote: string;
  /** Customer will return their empty bag for reuse/composting. */
  bagReturn: boolean;
  bagReturned: boolean;
  paymentDueAt: ISODate;
  reminderSentAt: ISODate | null;
  payment: { amountCents: number; receivedAt: ISODate; reference: string } | null;
  tracking: { carrier: string; number: string } | null;
  events: OrderEvent[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ── Roastery inventory ─────────────────────────────────────────────────────

export interface GreenLot {
  id: Id;
  code: string; // "ETH-2026-01"
  name: string;
  supplier: string;
  origin: { country: string; region: string; producer: string };
  process: string;
  varietal: string;
  certifications: SustainabilityTag[];
  costPerKgCents: number;
  receivedG: number;
  remainingG: number;
  arrivedAt: ISODate;
  notes: string;
}

export interface RoastBatch {
  id: Id;
  lotId: Id;
  productId: Id;
  roastedAt: ISODate;
  greenG: number;
  roastedG: number;
  chargeTempC: number | null;
  dropTempC: number | null;
  totalTimeS: number | null;
  devTimeS: number | null;
  cuppingScore: number | null;
  notes: string;
  createdAt: ISODate;
}

export const PACKAGING_KINDS = ["bag", "label", "valve", "box", "other"] as const;
export type PackagingKind = (typeof PACKAGING_KINDS)[number];

export interface PackagingItem {
  id: Id;
  name: string;
  kind: PackagingKind;
  onHand: number;
  reorderAt: number;
  compostable: boolean;
}

export type MovementKind = "green" | "roasted" | "packaging" | "bag_return";
export type MovementReason =
  | "received"
  | "roast_batch"
  | "order_packed"
  | "adjustment"
  | "bag_return";

/** Append-only audit log of every stock change. */
export interface InventoryMovement {
  id: Id;
  at: ISODate;
  kind: MovementKind;
  itemId: Id | null;
  itemName: string;
  delta: number;
  unit: "g" | "ea";
  reason: MovementReason;
  ref: string | null; // order number, batch id…
  note: string;
}

// ── Settings & dev outbox ──────────────────────────────────────────────────

export interface ShippingBand {
  maxWeightG: number;
  priceCents: number;
}

export interface ShippingRegion {
  id: Id;
  name: string;
  provinces: ProvinceCode[];
  bands: ShippingBand[]; // ascending by maxWeightG
}

export interface Settings {
  businessProvince: ProvinceCode;
  etransferEmail: string;
  paymentWindowDays: number;
  reminderAfterDays: number;
  pickup: { enabled: boolean; location: string; instructions: string };
  localDelivery: {
    enabled: boolean;
    feeCents: number;
    freeOverCents: number | null;
    fsas: string[]; // first 3 chars of postal codes we deliver to
  };
  shipping: { regions: ShippingRegion[]; freeOverCents: number | null };
  tax: { enabled: boolean };
}

export interface OutboxEmail {
  id: Id;
  to: string;
  subject: string;
  html: string;
  at: ISODate;
}
