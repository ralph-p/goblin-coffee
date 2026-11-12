// Domain schemas are added per phase and re-exported here:
//   catalog.ts   (Phase 1): products, variants, product_images
//   orders.ts    (Phase 2): orders, order_items, order_events, payments
//   shipping.ts  (Phase 3): shipping_zones, shipping_rates
//   auth.ts      (Phase 1/4): Better Auth tables
//   inventory.ts (Phase 5): suppliers, green_lots, roast_batches, packaging_items, inventory_movements
//   content.ts   (Phase 7): posts, discount_codes, subscriptions
export {};
