import { nanoid } from "nanoid";
import type { InventoryMovement } from "@/domain/types";
import type { Repo } from "@/server/repo/types";

/** Append a row to the inventory audit log. */
export function recordMovement(
  repo: Repo,
  at: Date,
  m: Omit<InventoryMovement, "id" | "at">,
) {
  return repo.movements.insert({ id: nanoid(10), at: at.toISOString(), ...m });
}

export async function listMovements(repo: Repo, limit = 200) {
  const all = await repo.movements.all();
  return all.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
