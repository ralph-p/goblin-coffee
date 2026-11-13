import { describe, expect, it } from "vitest";
import { greenNeededFor, lossPct } from "@/domain/roasting";
import { testCtx } from "@/test/test-ctx";
import { advanceOrder } from "./orders";
import { getRoastQueue, logRoastBatch } from "./roasting";

const batch = (over: Record<string, unknown> = {}) => ({
  lotId: "lot_eth",
  productId: "p_forest_floor",
  roastedAt: "2026-11-12",
  greenG: 1000,
  roastedG: 850,
  chargeTempC: null,
  dropTempC: null,
  totalTimeS: null,
  devTimeS: null,
  cuppingScore: null,
  notes: "",
  ...over,
});

describe("roast math", () => {
  it("computes loss and the green weight needed", () => {
    expect(lossPct(1000, 850)).toBe(15);
    expect(greenNeededFor(850, 15)).toBe(1000);
  });
});

describe("roast queue (hybrid stock)", () => {
  it("shows the shortfall for paid orders beyond what is on the shelf", async () => {
    const { ctx } = testCtx();
    const ff = (await getRoastQueue(ctx)).find((r) => r.productId === "p_forest_floor")!;
    // Seed: GC-1004 is paid for 2 × 340 g, and 300 g is on the shelf.
    expect(ff.demandG).toBe(680);
    expect(ff.onHandG).toBe(300);
    expect(ff.shortfallG).toBe(380);
    expect(ff.suggestedGreenG).toBeGreaterThan(380);
    expect(ff.orderNumbers).toEqual(["GC-1004"]);
  });

  it("counts awaiting-payment orders as pending, not demand", async () => {
    const { ctx } = testCtx();
    const gh = (await getRoastQueue(ctx)).find((r) => r.productId === "p_goblins_hollow")!;
    expect(gh.demandG).toBe(0);
    expect(gh.pendingG).toBe(1000);
  });
});

describe("logging a roast batch", () => {
  it("moves green to roasted stock and writes movements", async () => {
    const { ctx } = testCtx();
    await logRoastBatch(ctx, batch());
    expect((await ctx.repo.greenLots.get("lot_eth"))!.remainingG).toBe(21_400 - 1000);
    expect((await ctx.repo.products.get("p_forest_floor"))!.roastedOnHandG).toBe(300 + 850);
    expect(await ctx.repo.movements.all()).toHaveLength(2);
  });

  it("refuses to use more green coffee than the lot has", async () => {
    const { ctx } = testCtx();
    await expect(
      logRoastBatch(ctx, batch({ lotId: "lot_sum", productId: "p_ember_root", greenG: 7000, roastedG: 6000 })),
    ).rejects.toThrow(/only has 6200 g/);
  });

  it("rejects a roasted weight that isn't lower than the green weight", async () => {
    const { ctx } = testCtx();
    await expect(logRoastBatch(ctx, batch({ roastedG: 1000 }))).rejects.toThrow(/less than green/);
  });
});

describe("packing an order", () => {
  it("requires enough roasted coffee, and rolls back on failure", async () => {
    const { ctx } = testCtx();
    await expect(advanceOrder(ctx, "o_1004", "packed")).rejects.toThrow(/Roast first/);
    expect((await ctx.repo.orders.get("o_1004"))!.status).toBe("paid");
    expect((await ctx.repo.packaging.get("pk_bag_340"))!.onHand).toBe(120);
  });

  it("deducts roasted coffee and the packaging BOM once roasted", async () => {
    const { ctx } = testCtx();
    await logRoastBatch(ctx, batch());
    const packed = await advanceOrder(ctx, "o_1004", "packed");
    expect(packed.status).toBe("packed");
    expect((await ctx.repo.products.get("p_forest_floor"))!.roastedOnHandG).toBe(1150 - 680);
    expect((await ctx.repo.packaging.get("pk_bag_340"))!.onHand).toBe(118);
    expect((await ctx.repo.packaging.get("pk_label"))!.onHand).toBe(298);
    expect((await ctx.repo.packaging.get("pk_valve"))!.onHand).toBe(218);
  });
});
