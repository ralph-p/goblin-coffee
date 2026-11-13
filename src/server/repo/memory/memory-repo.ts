import fs from "node:fs";
import path from "node:path";
import type { Settings } from "@/domain/types";
import { NotFoundError, type Collection, type Repo } from "../types";
import type { SeedData } from "./seed";

type Keyed = { id: string };
type CollectionName = Exclude<keyof SeedData, "settings" | "orderSeq">;

const clone = <T>(v: T): T => structuredClone(v);

/**
 * In-memory Repo. Reads and writes go through structuredClone so callers can't
 * mutate stored data by accident (closer to how a real DB behaves).
 * When `persistPath` is set, the whole store is snapshotted to JSON after
 * writes so dev data survives restarts.
 */
export function createMemoryRepo(opts: { data: SeedData; persistPath?: string }): Repo {
  let data = opts.data;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let inTransaction = false;
  let queue: Promise<unknown> = Promise.resolve();

  function persist() {
    if (!opts.persistPath || inTransaction) return;
    if (saveTimer) clearTimeout(saveTimer);
    const file = opts.persistPath;
    saveTimer = setTimeout(() => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    }, 200);
  }

  function collection<K extends CollectionName>(
    name: K,
    label: string,
  ): Collection<SeedData[K][number] & Keyed> {
    type T = SeedData[K][number] & Keyed;
    const items = () => data[name] as T[];
    return {
      async all() {
        return clone(items());
      },
      async get(id) {
        const found = items().find((i) => i.id === id);
        return found ? clone(found) : null;
      },
      async findOne(pred) {
        const found = items().find((i) => pred(clone(i)));
        return found ? clone(found) : null;
      },
      async filter(pred) {
        return clone(items()).filter(pred);
      },
      async insert(item) {
        if (items().some((i) => i.id === item.id)) {
          throw new Error(`${label} ${item.id} already exists`);
        }
        items().push(clone(item));
        persist();
        return clone(item);
      },
      async update(id, fn) {
        const list = items();
        const idx = list.findIndex((i) => i.id === id);
        if (idx === -1) throw new NotFoundError(label, id);
        const next = fn(clone(list[idx]));
        list[idx] = clone({ ...next, id });
        persist();
        return clone(list[idx]);
      },
      async remove(id) {
        const list = items();
        const idx = list.findIndex((i) => i.id === id);
        if (idx !== -1) list.splice(idx, 1);
        persist();
      },
    };
  }

  const repo: Repo = {
    products: collection("products", "Product"),
    orders: collection("orders", "Order"),
    greenLots: collection("greenLots", "Green lot"),
    roastBatches: collection("roastBatches", "Roast batch"),
    packaging: collection("packaging", "Packaging item"),
    movements: collection("movements", "Movement"),
    outbox: collection("outbox", "Email"),
    settings: {
      async get() {
        return clone(data.settings);
      },
      async set(next: Settings) {
        data.settings = clone(next);
        persist();
        return clone(next);
      },
    },
    async nextOrderNumber() {
      data.orderSeq += 1;
      persist();
      return `GC-${data.orderSeq}`;
    },
    transaction<T>(fn: (tx: Repo) => Promise<T>): Promise<T> {
      // Serialize transactions so two requests can't interleave writes.
      const run = async () => {
        const snapshot = clone(data);
        inTransaction = true;
        try {
          const result = await fn(repo);
          inTransaction = false;
          persist();
          return result;
        } catch (err) {
          data = snapshot;
          inTransaction = false;
          throw err;
        }
      };
      const result = queue.then(run, run);
      queue = result.catch(() => undefined);
      return result;
    },
  };

  return repo;
}
