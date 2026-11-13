import type {
  GreenLot,
  InventoryMovement,
  Order,
  OutboxEmail,
  PackagingItem,
  Product,
  RoastBatch,
  Settings,
} from "@/domain/types";

/**
 * Storage-agnostic data access. Services depend only on this interface.
 * The memory implementation backs local dev today; a Drizzle/Neon
 * implementation can replace it later without touching the workflows.
 *
 * Everything is async so a real database fits the same signatures.
 */
export interface Collection<T extends { id: string }> {
  all(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  findOne(pred: (item: T) => boolean): Promise<T | null>;
  filter(pred: (item: T) => boolean): Promise<T[]>;
  insert(item: T): Promise<T>;
  update(id: string, fn: (current: T) => T): Promise<T>;
  remove(id: string): Promise<void>;
}

export interface Repo {
  products: Collection<Product>;
  orders: Collection<Order>;
  greenLots: Collection<GreenLot>;
  roastBatches: Collection<RoastBatch>;
  packaging: Collection<PackagingItem>;
  movements: Collection<InventoryMovement>;
  outbox: Collection<OutboxEmail>;
  settings: {
    get(): Promise<Settings>;
    set(next: Settings): Promise<Settings>;
  };
  /** Next human-readable order number, e.g. "GC-1007". */
  nextOrderNumber(): Promise<string>;
  /** Run `fn` atomically: if it throws, nothing it wrote is kept. */
  transaction<T>(fn: (tx: Repo) => Promise<T>): Promise<T>;
}

export class NotFoundError extends Error {
  constructor(what: string, id: string) {
    super(`${what} ${id} not found`);
    this.name = "NotFoundError";
  }
}
