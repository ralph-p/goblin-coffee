"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { addLine, cartLineSchema, setLineQty } from "@/domain/cart";
import { runAction, type ActionState } from "@/server/action-result";
import { appCtx } from "@/server/app-context";
import { readCart, writeCart } from "@/server/cart-cookie";
import { resolveCart } from "@/server/services/cart";
import { placeOrder } from "@/server/services/checkout";
import { UserError } from "@/server/services/errors";

export async function addToCartAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const parsed = cartLineSchema.safeParse({
      variantId: fd.get("variantId"),
      grind: fd.get("grind"),
      qty: Number(fd.get("qty")),
    });
    if (!parsed.success) throw new UserError("Choose a size, grind and quantity.");
    const { lines } = await resolveCart(appCtx(), [parsed.data]);
    if (lines.length === 0) throw new UserError("That coffee isn't available right now.");
    await writeCart(addLine(await readCart(), parsed.data));
    return { ok: true, message: "Added to your cart." };
  });
}

export async function updateCartLineAction(fd: FormData) {
  const key = String(fd.get("key") ?? "");
  const qty = Number(fd.get("qty"));
  if (!key || !Number.isFinite(qty)) return;
  await writeCart(setLineQty(await readCart(), key, Math.floor(qty)));
  refresh();
}

export async function placeOrderAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let target = "";
  const result = await runAction(async () => {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
    const order = await placeOrder(
      appCtx(),
      {
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone") ?? "",
        method: fd.get("method"),
        line1: fd.get("line1") ?? "",
        line2: fd.get("line2") ?? "",
        city: fd.get("city") ?? "",
        province: fd.get("province") ?? "",
        postalCode: fd.get("postalCode") ?? "",
        customerNote: fd.get("customerNote") ?? "",
        bagReturn: fd.get("bagReturn") === "on",
        website: fd.get("website") ?? "",
      },
      await readCart(),
      ip,
    );
    await writeCart([]);
    target = `/order/${order.number}?t=${order.accessToken}&new=1`;
  });
  if (target) redirect(target);
  return result;
}
