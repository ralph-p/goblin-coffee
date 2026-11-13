import { z } from "zod";
import { PROVINCE_CODES } from "./provinces";
import {
  FULFILLMENT_METHODS,
  GRINDS,
  PACKAGING_KINDS,
  PRODUCT_STATUSES,
  ROAST_LEVELS,
  SUSTAINABILITY_TAGS,
} from "./types";

/** Input schemas shared by forms (client) and services (server). */

const int = (min = 0) => z.coerce.number().int().min(min);
const trimmed = (max = 200) => z.string().trim().max(max);

export const variantInputSchema = z.object({
  id: z.string().optional(),
  label: trimmed(40).min(1, "Label is required"),
  sizeG: int(1),
  priceCents: int(1),
  shipWeightG: int(1),
  sku: trimmed(40).min(1, "SKU is required"),
  active: z.boolean(),
  bom: z.array(z.object({ packagingItemId: z.string().min(1), qty: int(1) })),
});

export const productInputSchema = z.object({
  name: trimmed(80).min(1, "Name is required"),
  slug: trimmed(80)
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes"),
  tagline: trimmed(120),
  description: trimmed(4000),
  status: z.enum(PRODUCT_STATUSES),
  origin: z.object({
    country: trimmed(60),
    region: trimmed(80),
    producer: trimmed(120),
    altitudeM: z.coerce.number().int().min(0).max(4000).nullable(),
  }),
  process: trimmed(60),
  varietal: trimmed(120),
  roastLevel: z.enum(ROAST_LEVELS),
  tastingNotes: z.array(trimmed(40).min(1)).max(6),
  tags: z.array(z.enum(SUSTAINABILITY_TAGS)),
  greenLotId: z.string().nullable(),
  grinds: z.array(z.enum(GRINDS)).min(1, "Offer at least one grind"),
  taxable: z.boolean(),
  variants: z.array(variantInputSchema).min(1, "Add at least one size"),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const checkoutInputSchema = z
  .object({
    name: trimmed(100).min(2, "Enter your name"),
    email: z.email("Enter a valid email"),
    phone: trimmed(30),
    method: z.enum(FULFILLMENT_METHODS),
    line1: trimmed(120),
    line2: trimmed(120),
    city: trimmed(80),
    province: z.enum(PROVINCE_CODES).or(z.literal("")),
    postalCode: trimmed(10),
    customerNote: trimmed(500),
    bagReturn: z.boolean(),
    /** Honeypot: real people never fill this in. */
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.method === "pickup") return;
    if (!v.line1) ctx.addIssue({ code: "custom", path: ["line1"], message: "Enter your street address" });
    if (!v.city) ctx.addIssue({ code: "custom", path: ["city"], message: "Enter your city" });
    if (!v.province) ctx.addIssue({ code: "custom", path: ["province"], message: "Choose a province" });
    if (!v.postalCode) ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Enter your postal code" });
  });
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export const greenLotInputSchema = z.object({
  code: trimmed(30).min(1, "Code is required"),
  name: trimmed(80).min(1, "Name is required"),
  supplier: trimmed(80),
  country: trimmed(60).min(1, "Country is required"),
  region: trimmed(80),
  producer: trimmed(120),
  process: trimmed(60),
  varietal: trimmed(120),
  certifications: z.array(z.enum(SUSTAINABILITY_TAGS)),
  costPerKgCents: int(0),
  receivedG: int(1),
  arrivedAt: z.iso.date(),
  notes: trimmed(1000),
});
export type GreenLotInput = z.infer<typeof greenLotInputSchema>;

export const roastBatchInputSchema = z
  .object({
    lotId: z.string().min(1, "Choose a green lot"),
    productId: z.string().min(1, "Choose a coffee"),
    roastedAt: z.iso.date(),
    greenG: int(1),
    roastedG: int(1),
    chargeTempC: z.coerce.number().nullable(),
    dropTempC: z.coerce.number().nullable(),
    totalTimeS: z.coerce.number().int().nullable(),
    devTimeS: z.coerce.number().int().nullable(),
    cuppingScore: z.coerce.number().min(0).max(100).nullable(),
    notes: trimmed(1000),
  })
  .refine((v) => v.roastedG < v.greenG, {
    path: ["roastedG"],
    message: "Roasted weight must be less than green weight",
  });
export type RoastBatchInput = z.infer<typeof roastBatchInputSchema>;

export const packagingInputSchema = z.object({
  name: trimmed(80).min(1, "Name is required"),
  kind: z.enum(PACKAGING_KINDS),
  onHand: int(0),
  reorderAt: int(0),
  compostable: z.boolean(),
});
export type PackagingInput = z.infer<typeof packagingInputSchema>;
