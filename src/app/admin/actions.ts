"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { nanoid } from "nanoid";
import { ORDER_STATUSES, type OrderStatus } from "@/domain/types";
import { parseDollars } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { runAction, type ActionState } from "@/server/action-result";
import { storage } from "@/server/adapters/storage";
import { appCtx, requireAdmin } from "@/server/app-context";
import * as catalog from "@/server/services/catalog";
import { UserError } from "@/server/services/errors";
import * as inventory from "@/server/services/inventory";
import { JOBS, type JobName } from "@/server/services/jobs";
import * as orders from "@/server/services/orders";
import { logRoastBatch } from "@/server/services/roasting";
import { saveSettings } from "@/server/services/settings";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/** Every admin action: auth check → work → refresh the current page. */
function adminAction(fn: (fd: FormData) => Promise<string | void>): Action {
  return async (_prev, fd) =>
    runAction(async () => {
      await requireAdmin();
      const message = await fn(fd);
      refresh();
      return { ok: true, message: message ?? "Saved." };
    });
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const int = (fd: FormData, k: string) => {
  const n = Number(str(fd, k));
  if (!Number.isInteger(n)) throw new UserError(`${k} must be a whole number.`);
  return n;
};
const json = (fd: FormData) => {
  try {
    return JSON.parse(str(fd, "payload"));
  } catch {
    throw new UserError("Invalid form data.");
  }
};

// ── Orders ────────────────────────────────────────────────────────────────

export const markPaidAction = adminAction(async (fd) => {
  const cents = parseDollars(str(fd, "amount"));
  if (Number.isNaN(cents)) throw new UserError("Enter the amount like 42.00");
  await orders.markPaid(appCtx(), str(fd, "id"), { amountCents: cents, reference: str(fd, "reference") });
  return `Marked paid (${formatCents(cents)}). Confirmation emailed.`;
});

export const advanceOrderAction = adminAction(async (fd) => {
  const to = str(fd, "to") as OrderStatus;
  if (!ORDER_STATUSES.includes(to)) throw new UserError("Unknown status.");
  await orders.advanceOrder(appCtx(), str(fd, "id"), to);
  return "Order updated.";
});

export const shipOrderAction = adminAction(async (fd) => {
  const ctx = appCtx();
  const id = str(fd, "id");
  const carrier = str(fd, "carrier");
  const number = str(fd, "trackingNumber");
  if (carrier || number) await orders.setTracking(ctx, id, carrier, number);
  await orders.advanceOrder(ctx, id, "shipped");
  return "Marked shipped. Customer emailed.";
});

export const cancelOrderAction = adminAction(async (fd) => {
  await orders.cancelOrder(appCtx(), str(fd, "id"), str(fd, "reason"));
  return "Order cancelled. Customer emailed.";
});

export const bagReturnedAction = adminAction(async (fd) => {
  await orders.markBagReturned(appCtx(), str(fd, "id"));
  return "Bag return recorded. Thank you, goblin!";
});

export const addNoteAction = adminAction(async (fd) => {
  await orders.addNote(appCtx(), str(fd, "id"), str(fd, "note"));
  return "Note added.";
});

// ── Catalog ───────────────────────────────────────────────────────────────

export async function saveProductAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let createdId = "";
  const result = await runAction(async () => {
    await requireAdmin();
    const id = str(fd, "id") || undefined;
    const product = await catalog.saveProduct(appCtx(), json(fd), id);
    if (!id) createdId = product.id;
    return { ok: true, message: "Product saved." };
  });
  if (createdId) redirect(`/admin/products/${createdId}`);
  return result;
}

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const uploadImageAction = adminAction(async (fd) => {
  const id = str(fd, "id");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) throw new UserError("Choose an image.");
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new UserError("Use a JPG, PNG, WebP or AVIF image.");
  if (file.size > 5 * 1024 * 1024) throw new UserError("Images must be under 5 MB.");
  const key = `products/${id}/${nanoid(10)}.${ext}`;
  await storage().put(key, new Uint8Array(await file.arrayBuffer()), file.type);
  await catalog.addProductImage(appCtx(), id, key, str(fd, "alt"));
  return "Image uploaded.";
});

export const removeImageAction = adminAction(async (fd) => {
  await catalog.removeProductImage(appCtx(), str(fd, "id"), str(fd, "key"));
  return "Image removed.";
});

export const coverImageAction = adminAction(async (fd) => {
  await catalog.makeCoverImage(appCtx(), str(fd, "id"), str(fd, "key"));
  return "Cover image updated.";
});

// ── Roasting & inventory ──────────────────────────────────────────────────

const optNum = (fd: FormData, k: string) => (str(fd, k) === "" ? null : Number(str(fd, k)));

export const logBatchAction = adminAction(async (fd) => {
  const batch = await logRoastBatch(appCtx(), {
    lotId: str(fd, "lotId"),
    productId: str(fd, "productId"),
    roastedAt: str(fd, "roastedAt"),
    greenG: str(fd, "greenG"),
    roastedG: str(fd, "roastedG"),
    chargeTempC: optNum(fd, "chargeTempC"),
    dropTempC: optNum(fd, "dropTempC"),
    totalTimeS: optNum(fd, "totalTimeS"),
    devTimeS: optNum(fd, "devTimeS"),
    cuppingScore: optNum(fd, "cuppingScore"),
    notes: str(fd, "notes"),
  });
  return `Batch logged: ${batch.roastedG} g added to the shelf.`;
});

export const adjustRoastedAction = adminAction(async (fd) => {
  await inventory.adjustRoasted(appCtx(), str(fd, "id"), int(fd, "delta"), str(fd, "note"));
  return "Roasted stock adjusted.";
});

export const createGreenLotAction = adminAction(async (fd) => {
  await inventory.createGreenLot(appCtx(), {
    code: str(fd, "code"),
    name: str(fd, "name"),
    supplier: str(fd, "supplier"),
    country: str(fd, "country"),
    region: str(fd, "region"),
    producer: str(fd, "producer"),
    process: str(fd, "process"),
    varietal: str(fd, "varietal"),
    certifications: fd.getAll("certifications").map(String),
    costPerKgCents: parseDollars(str(fd, "costPerKg")),
    receivedG: Math.round(Number(str(fd, "receivedKg")) * 1000),
    arrivedAt: str(fd, "arrivedAt"),
    notes: str(fd, "notes"),
  });
  return "Green lot received.";
});

export const adjustGreenLotAction = adminAction(async (fd) => {
  await inventory.adjustGreenLot(appCtx(), str(fd, "id"), int(fd, "delta"), str(fd, "note"));
  return "Lot adjusted.";
});

export const createPackagingAction = adminAction(async (fd) => {
  await inventory.createPackagingItem(appCtx(), {
    name: str(fd, "name"),
    kind: str(fd, "kind"),
    onHand: str(fd, "onHand") || "0",
    reorderAt: str(fd, "reorderAt") || "0",
    compostable: fd.get("compostable") === "on",
  });
  return "Packaging item added.";
});

export const adjustPackagingAction = adminAction(async (fd) => {
  await inventory.adjustPackaging(appCtx(), str(fd, "id"), int(fd, "delta"), str(fd, "note"));
  return "Stock updated.";
});

export const reorderPointAction = adminAction(async (fd) => {
  await inventory.setReorderPoint(appCtx(), str(fd, "id"), int(fd, "reorderAt"));
  return "Reorder point saved.";
});

// ── Settings & jobs ───────────────────────────────────────────────────────

export const saveSettingsAction = adminAction(async (fd) => {
  await saveSettings(appCtx(), json(fd));
  return "Settings saved.";
});

export const runJobAction = adminAction(async (fd) => {
  const name = str(fd, "job") as JobName;
  if (!(name in JOBS)) throw new UserError("Unknown job.");
  const result = await JOBS[name](appCtx());
  const affected = Object.values(result)[0];
  return affected.length ? `Done: ${affected.join(", ")}` : "Nothing to do.";
});
