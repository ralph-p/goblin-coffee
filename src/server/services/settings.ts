import { z } from "zod";
import { PROVINCE_CODES } from "@/domain/provinces";
import type { Settings } from "@/domain/types";
import type { Ctx } from "@/server/context";
import { UserError } from "./errors";

const settingsSchema = z.object({
  businessProvince: z.enum(PROVINCE_CODES),
  etransferEmail: z.email("Enter the e-Transfer email"),
  paymentWindowDays: z.number().int().min(1).max(14),
  reminderAfterDays: z.number().int().min(0).max(13),
  pickup: z.object({ enabled: z.boolean(), location: z.string().max(200), instructions: z.string().max(500) }),
  localDelivery: z.object({
    enabled: z.boolean(),
    feeCents: z.number().int().min(0),
    freeOverCents: z.number().int().min(0).nullable(),
    fsas: z.array(z.string().regex(/^[A-Z]\d[A-Z]$/, "FSAs look like K1N")),
  }),
  shipping: z.object({
    freeOverCents: z.number().int().min(0).nullable(),
    regions: z.array(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        provinces: z.array(z.enum(PROVINCE_CODES)),
        bands: z
          .array(z.object({ maxWeightG: z.number().int().min(1), priceCents: z.number().int().min(0) }))
          .min(1, "Each region needs at least one weight band"),
      }),
    ),
  }),
  tax: z.object({ enabled: z.boolean() }),
});

export function getSettings(ctx: Ctx) {
  return ctx.repo.settings.get();
}

export async function saveSettings(ctx: Ctx, raw: unknown): Promise<Settings> {
  const r = settingsSchema.safeParse(raw);
  if (!r.success) {
    const i = r.error.issues[0];
    throw new UserError(`${i.path.join(".")}: ${i.message}`);
  }
  const s = r.data;
  if (s.reminderAfterDays >= s.paymentWindowDays) {
    throw new UserError("Send the reminder before the payment window closes.");
  }
  for (const region of s.shipping.regions) {
    region.bands.sort((a, b) => a.maxWeightG - b.maxWeightG);
  }
  return ctx.repo.settings.set(s);
}
