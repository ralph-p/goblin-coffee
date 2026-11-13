import { priceOrder } from "@/domain/pricing";
import type { ProvinceCode } from "@/domain/provinces";
import type {
  GreenLot,
  Grind,
  InventoryMovement,
  Order,
  OrderLine,
  OrderStatus,
  OutboxEmail,
  PackagingItem,
  Product,
  RoastBatch,
  Settings,
  Variant,
} from "@/domain/types";

export interface SeedData {
  products: Product[];
  orders: Order[];
  greenLots: GreenLot[];
  roastBatches: RoastBatch[];
  packaging: PackagingItem[];
  movements: InventoryMovement[];
  outbox: OutboxEmail[];
  settings: Settings;
  orderSeq: number;
}

const DAY = 86_400_000;

export const defaultSettings: Settings = {
  businessProvince: "ON",
  etransferEmail: "pay@goblincoffee.ca",
  paymentWindowDays: 3,
  reminderAfterDays: 1,
  pickup: {
    enabled: true,
    location: "Goblin Coffee Roastery (side door), 12 Mossy Lane",
    instructions: "Saturdays 9am–1pm, or message us to arrange another time.",
  },
  localDelivery: {
    enabled: true,
    feeCents: 500,
    freeOverCents: 4000,
    fsas: ["K1N", "K1P", "K1R", "K1S", "K1Y", "K2P"],
  },
  shipping: {
    freeOverCents: 7500,
    regions: [
      {
        id: "on-qc",
        name: "Ontario & Quebec",
        provinces: ["ON", "QC"],
        bands: [
          { maxWeightG: 500, priceCents: 1100 },
          { maxWeightG: 1200, priceCents: 1500 },
          { maxWeightG: 2500, priceCents: 2000 },
          { maxWeightG: 5000, priceCents: 2800 },
        ],
      },
      {
        id: "atlantic",
        name: "Atlantic Canada",
        provinces: ["NB", "NS", "PE", "NL"],
        bands: [
          { maxWeightG: 500, priceCents: 1400 },
          { maxWeightG: 1200, priceCents: 1900 },
          { maxWeightG: 2500, priceCents: 2500 },
          { maxWeightG: 5000, priceCents: 3400 },
        ],
      },
      {
        id: "west",
        name: "Western Canada",
        provinces: ["MB", "SK", "AB", "BC"],
        bands: [
          { maxWeightG: 500, priceCents: 1500 },
          { maxWeightG: 1200, priceCents: 2100 },
          { maxWeightG: 2500, priceCents: 2800 },
          { maxWeightG: 5000, priceCents: 3800 },
        ],
      },
      {
        id: "north",
        name: "The North",
        provinces: ["YT", "NT", "NU"],
        bands: [
          { maxWeightG: 500, priceCents: 2400 },
          { maxWeightG: 1200, priceCents: 3200 },
          { maxWeightG: 2500, priceCents: 4500 },
        ],
      },
    ],
  },
  tax: { enabled: false },
};

const packaging: PackagingItem[] = [
  { id: "pk_bag_250", name: "Compostable bag 250 g", kind: "bag", onHand: 60, reorderAt: 20, compostable: true },
  { id: "pk_bag_340", name: "Compostable bag 340 g", kind: "bag", onHand: 120, reorderAt: 40, compostable: true },
  { id: "pk_bag_1kg", name: "Compostable bag 1 kg", kind: "bag", onHand: 25, reorderAt: 10, compostable: true },
  { id: "pk_label", name: "Bag label (recycled paper)", kind: "label", onHand: 300, reorderAt: 100, compostable: true },
  { id: "pk_valve", name: "One-way degassing valve", kind: "valve", onHand: 220, reorderAt: 80, compostable: false },
  { id: "pk_box_small", name: "Recycled mailer box (small)", kind: "box", onHand: 40, reorderAt: 15, compostable: true },
  { id: "pk_box_large", name: "Recycled mailer box (large)", kind: "box", onHand: 8, reorderAt: 10, compostable: true },
];

const bagBom = (bag: string) => [
  { packagingItemId: bag, qty: 1 },
  { packagingItemId: "pk_label", qty: 1 },
  { packagingItemId: "pk_valve", qty: 1 },
];

function variant(productCode: string, sizeG: 250 | 340 | 1000, priceCents: number): Variant {
  const bag = sizeG === 250 ? "pk_bag_250" : sizeG === 340 ? "pk_bag_340" : "pk_bag_1kg";
  return {
    id: `v_${productCode}_${sizeG}`,
    label: sizeG === 1000 ? "1 kg" : `${sizeG} g`,
    sizeG,
    priceCents,
    shipWeightG: sizeG === 250 ? 300 : sizeG === 340 ? 400 : 1080,
    sku: `GC-${productCode.toUpperCase()}-${sizeG}`,
    active: true,
    bom: bagBom(bag),
  };
}

const ALL_GRINDS: Grind[] = ["whole_bean", "espresso", "pour_over", "drip", "french_press"];

export function seed(now = Date.now()): SeedData {
  const iso = (offsetDays: number) => new Date(now + offsetDays * DAY).toISOString();

  const greenLots: GreenLot[] = [
    {
      id: "lot_eth", code: "ETH-26-01", name: "Guji Hambela washed", supplier: "Forest Path Importers",
      origin: { country: "Ethiopia", region: "Guji, Hambela", producer: "Hambela smallholder washing station" },
      process: "Washed", varietal: "Ethiopian landrace", certifications: ["organic", "direct_trade"],
      costPerKgCents: 1450, receivedG: 30_000, remainingG: 21_400, arrivedAt: iso(-60), notes: "60 kg GrainPro bags.",
    },
    {
      id: "lot_col", code: "COL-26-02", name: "Huila women's co-op", supplier: "Andes Direct",
      origin: { country: "Colombia", region: "Huila", producer: "Women-led producer co-op" },
      process: "Washed", varietal: "Caturra, Castillo", certifications: ["women_producers", "fair_trade"],
      costPerKgCents: 1180, receivedG: 35_000, remainingG: 28_100, arrivedAt: iso(-45), notes: "",
    },
    {
      id: "lot_sum", code: "SUM-26-01", name: "Gayo highlands", supplier: "Forest Path Importers",
      origin: { country: "Indonesia", region: "Aceh, Gayo highlands", producer: "Gayo farmer co-op" },
      process: "Wet-hulled", varietal: "Ateng, Tim Tim", certifications: ["organic", "shade_grown"],
      costPerKgCents: 1090, receivedG: 20_000, remainingG: 6_200, arrivedAt: iso(-90), notes: "Running low, reorder soon.",
    },
    {
      id: "lot_bra", code: "BRA-26-01", name: "Cerrado natural", supplier: "Andes Direct",
      origin: { country: "Brazil", region: "Cerrado Mineiro", producer: "Family estate" },
      process: "Natural", varietal: "Yellow Catuaí, Mundo Novo", certifications: ["rainforest_alliance"],
      costPerKgCents: 890, receivedG: 30_000, remainingG: 19_800, arrivedAt: iso(-30), notes: "",
    },
  ];

  const base = (p: Omit<Product, "createdAt" | "updatedAt" | "images" | "status" | "taxable" | "grinds">): Product => ({
    ...p, status: "active", images: [], taxable: false, grinds: ALL_GRINDS, createdAt: iso(-60), updatedAt: iso(-1),
  });

  const products: Product[] = [
    base({
      id: "p_forest_floor", slug: "forest-floor", name: "Forest Floor",
      tagline: "Bright, floral and full of stone fruit",
      description: "A washed Ethiopian from the Hambela highlands, grown under native forest canopy. Delicate jasmine, bergamot and ripe peach. Our lightest roast, made for pour over.",
      origin: { country: "Ethiopia", region: "Guji, Hambela", producer: "Hambela smallholders", altitudeM: 2100 },
      process: "Washed", varietal: "Ethiopian landrace", roastLevel: "light",
      tastingNotes: ["Jasmine", "Bergamot", "Peach"], tags: ["organic", "direct_trade"], greenLotId: "lot_eth",
      variants: [variant("ff", 250, 1800), variant("ff", 340, 2300), variant("ff", 1000, 6200)],
      roastedOnHandG: 300,
    }),
    base({
      id: "p_moss_stone", slug: "moss-and-stone", name: "Moss & Stone",
      tagline: "Caramel, red apple and cocoa",
      description: "Grown by a women-led co-op in Huila. A balanced, sweet everyday coffee that works for any brew method.",
      origin: { country: "Colombia", region: "Huila", producer: "Women-led producer co-op", altitudeM: 1750 },
      process: "Washed", varietal: "Caturra, Castillo", roastLevel: "medium",
      tastingNotes: ["Caramel", "Red apple", "Cocoa"], tags: ["women_producers", "fair_trade"], greenLotId: "lot_col",
      variants: [variant("ms", 340, 2100), variant("ms", 1000, 5600)],
      roastedOnHandG: 1500,
    }),
    base({
      id: "p_ember_root", slug: "ember-root", name: "Ember Root",
      tagline: "Deep, earthy and syrupy",
      description: "Shade-grown in the Gayo highlands and wet-hulled the traditional Sumatran way. Dark chocolate, cedar and molasses.",
      origin: { country: "Indonesia", region: "Aceh, Gayo", producer: "Gayo farmer co-op", altitudeM: 1500 },
      process: "Wet-hulled", varietal: "Ateng, Tim Tim", roastLevel: "medium_dark",
      tastingNotes: ["Dark chocolate", "Cedar", "Molasses"], tags: ["organic", "shade_grown"], greenLotId: "lot_sum",
      variants: [variant("er", 340, 2200), variant("er", 1000, 5900)],
      roastedOnHandG: 900,
    }),
    base({
      id: "p_goblins_hollow", slug: "goblins-hollow", name: "Goblin's Hollow Espresso",
      tagline: "Hazelnut, milk chocolate, brown sugar",
      description: "Our house espresso: a Cerrado natural roasted for sweetness and body. Great with milk, and just as good straight.",
      origin: { country: "Brazil", region: "Cerrado Mineiro", producer: "Family estate", altitudeM: 1100 },
      process: "Natural", varietal: "Yellow Catuaí, Mundo Novo", roastLevel: "medium_dark",
      tastingNotes: ["Hazelnut", "Milk chocolate", "Brown sugar"], tags: ["rainforest_alliance"], greenLotId: "lot_bra",
      variants: [variant("gh", 340, 2000), variant("gh", 1000, 5200)],
      roastedOnHandG: 2500,
    }),
  ];

  const batch = (id: string, productId: string, lotId: string, daysAgo: number, greenG: number, roastedG: number, extra: Partial<RoastBatch> = {}): RoastBatch => ({
    id, productId, lotId, roastedAt: iso(-daysAgo), greenG, roastedG,
    chargeTempC: 200, dropTempC: 205, totalTimeS: 600, devTimeS: 90, cuppingScore: null, notes: "",
    createdAt: iso(-daysAgo), ...extra,
  });

  const roastBatches: RoastBatch[] = [
    batch("rb_1", "p_forest_floor", "lot_eth", 12, 4300, 3700, { dropTempC: 201, devTimeS: 75, cuppingScore: 87.5, notes: "Super floral, cut dev slightly next time." }),
    batch("rb_2", "p_moss_stone", "lot_col", 9, 3500, 2980, { cuppingScore: 85 }),
    batch("rb_3", "p_ember_root", "lot_sum", 6, 3000, 2520, { dropTempC: 214, devTimeS: 110 }),
    batch("rb_4", "p_goblins_hollow", "lot_bra", 4, 5000, 4200, { dropTempC: 212, devTimeS: 105, cuppingScore: 84 }),
    batch("rb_5", "p_forest_floor", "lot_eth", 3, 4300, 3680, { dropTempC: 201, devTimeS: 70, cuppingScore: 88 }),
  ];

  // ── Orders across every status so each admin screen has data ────────────
  const byId = new Map(products.map((p) => [p.id, p]));
  const line = (productId: string, size: number, grind: Grind, qty: number): OrderLine => {
    const p = byId.get(productId)!;
    const v = p.variants.find((x) => x.sizeG === size)!;
    return { productId, variantId: v.id, productName: p.name, variantLabel: v.label, grind, qty, unitPriceCents: v.priceCents, sizeG: v.sizeG };
  };

  let seq = 1000;
  const order = (o: {
    status: OrderStatus; daysAgo: number; name: string; email: string; lines: OrderLine[];
    method: Order["fulfillment"]["method"]; province?: ProvinceCode;
    postalCode?: string; city?: string; bagReturn?: boolean; reminderSent?: boolean; tracking?: Order["tracking"];
  }): Order => {
    seq += 1;
    const address = o.method === "pickup" ? null : {
      line1: "45 Fern Street", line2: "", city: o.city ?? "Ottawa", province: o.province ?? "ON", postalCode: o.postalCode ?? "K1N 5T5",
    };
    const priced = priceOrder(
      o.lines.map((l) => ({ unitPriceCents: l.unitPriceCents, qty: l.qty, shipWeightG: byId.get(l.productId)!.variants.find((v) => v.id === l.variantId)!.shipWeightG, taxable: false })),
      { method: o.method, province: address?.province ?? null, postalCode: address?.postalCode ?? null },
      defaultSettings,
    );
    if (!priced.ok) throw new Error(`Seed order failed to price: ${priced.error}`);
    const created = iso(-o.daysAgo);
    const paidStatuses: OrderStatus[] = ["paid", "roasting", "packed", "shipped", "ready_for_pickup", "completed"];
    const isPaid = paidStatuses.includes(o.status);
    return {
      id: `o_${seq}`, number: `GC-${seq}`, accessToken: `seedtoken${seq}`, status: o.status,
      customer: { name: o.name, email: o.email, phone: "" },
      fulfillment: { method: o.method, address },
      lines: o.lines, totals: priced.totals, customerNote: "",
      bagReturn: o.bagReturn ?? false, bagReturned: false,
      paymentDueAt: iso(-o.daysAgo + defaultSettings.paymentWindowDays),
      reminderSentAt: o.reminderSent ? iso(-o.daysAgo + 1) : null,
      payment: isPaid ? { amountCents: priced.totals.totalCents, receivedAt: iso(-o.daysAgo + 0.5), reference: "" } : null,
      tracking: o.tracking ?? null,
      events: [
        { at: created, type: "created", message: "Order placed" },
        ...(isPaid ? [{ at: iso(-o.daysAgo + 0.5), type: "payment" as const, message: "e-Transfer received" }] : []),
        ...(o.status !== "awaiting_payment" && o.status !== "paid" ? [{ at: iso(-o.daysAgo + 1), type: "status" as const, message: `Status → ${o.status}` }] : []),
      ],
      createdAt: created, updatedAt: created,
    };
  };

  const orders: Order[] = [
    order({ status: "completed", daysAgo: 20, name: "Avery Lindqvist", email: "avery@example.com", method: "ship", province: "BC", city: "Victoria", postalCode: "V8V 1A1", lines: [line("p_moss_stone", 1000, "whole_bean", 1)], tracking: { carrier: "Canada Post", number: "7023210039414604" } }),
    order({ status: "shipped", daysAgo: 6, name: "Sam Okafor", email: "sam@example.com", method: "ship", province: "QC", city: "Montréal", postalCode: "H2X 1Y4", lines: [line("p_ember_root", 340, "french_press", 2)], tracking: { carrier: "Canada Post", number: "7023210039414611" } }),
    order({ status: "packed", daysAgo: 3, name: "Jordan Tremblay", email: "jordan@example.com", method: "pickup", lines: [line("p_goblins_hollow", 340, "espresso", 1), line("p_forest_floor", 250, "pour_over", 1)], bagReturn: true }),
    order({ status: "paid", daysAgo: 1, name: "Riley Chen", email: "riley@example.com", method: "local_delivery", postalCode: "K1P 5J2", lines: [line("p_forest_floor", 340, "whole_bean", 2)], bagReturn: true }),
    order({ status: "awaiting_payment", daysAgo: 5, name: "Morgan Patel", email: "morgan@example.com", method: "ship", province: "ON", city: "Toronto", postalCode: "M5V 2T6", lines: [line("p_moss_stone", 340, "drip", 1)], reminderSent: true }),
    order({ status: "awaiting_payment", daysAgo: 1.5, name: "Casey Nguyen", email: "casey@example.com", method: "ship", province: "NS", city: "Halifax", postalCode: "B3H 1A1", lines: [line("p_goblins_hollow", 1000, "espresso", 1), line("p_ember_root", 340, "whole_bean", 1)] }),
  ];

  return {
    products, orders, greenLots, roastBatches, packaging,
    movements: [], outbox: [], settings: structuredClone(defaultSettings), orderSeq: seq,
  };
}
