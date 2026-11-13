import { connection } from "next/server";
import { ActionForm, selectClass, SubmitButton } from "@/components/forms";
import { Panel, PageHeader, table } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PACKAGING_KINDS } from "@/domain/types";
import { cn } from "@/lib/utils";
import { appCtx } from "@/server/app-context";
import { listPackaging } from "@/server/services/inventory";
import { adjustPackagingAction, createPackagingAction, reorderPointAction } from "../../actions";

export const metadata = { title: "Packaging" };

export default async function PackagingPage() {
  await connection();
  const ctx = appCtx();
  const [items, products] = await Promise.all([listPackaging(ctx), ctx.repo.products.all()]);
  const usedBy = (id: string) =>
    products.flatMap((p) => p.variants.filter((v) => v.bom.some((b) => b.packagingItemId === id)).map((v) => `${p.name} ${v.label}`));

  return (
    <main>
      <PageHeader
        title="Packaging"
        description="Bags, labels, valves and boxes. Packing an order deducts each size's bill of materials automatically."
      />
      <div className="grid gap-6 p-6 xl:grid-cols-[1fr_320px]">
        <Panel title="Stock">
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Item</th>
                  <th className={`${table.th} ${table.num}`}>On hand</th>
                  <th className={table.th}>Reorder at</th>
                  <th className={table.th}>Receive / adjust</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const uses = usedBy(i.id);
                  return (
                    <tr key={i.id}>
                      <td className={table.td}>
                        <span className="font-medium">{i.name}</span>
                        <span className="block text-xs text-muted-foreground capitalize">
                          {i.kind}{i.compostable ? " · compostable ♻" : ""}
                        </span>
                        {uses.length > 0 && (
                          <span className="block max-w-72 text-xs text-muted-foreground">Used by {uses.length} size{uses.length > 1 ? "s" : ""}</span>
                        )}
                      </td>
                      <td className={cn(table.td, table.num, i.low && "font-semibold text-clay")}>
                        {i.onHand}
                        {i.low && <span className="block text-xs font-normal">reorder</span>}
                      </td>
                      <td className={table.td}>
                        <ActionForm action={reorderPointAction} className="flex flex-col gap-1">
                          <input type="hidden" name="id" value={i.id} />
                          <div className="flex gap-1.5">
                            <Input name="reorderAt" type="number" min={0} defaultValue={i.reorderAt} className="w-20" aria-label="Reorder at" />
                            <SubmitButton variant="ghost" size="sm">Set</SubmitButton>
                          </div>
                        </ActionForm>
                      </td>
                      <td className={table.td}>
                        <ActionForm action={adjustPackagingAction} className="flex flex-col gap-1">
                          <input type="hidden" name="id" value={i.id} />
                          <div className="flex gap-1.5">
                            <Input name="delta" type="number" placeholder="+100 or −3" className="w-28" aria-label="Change" />
                            <Input name="note" placeholder="Note" className="w-28" aria-label="Note" />
                            <SubmitButton variant="outline" size="sm">Save</SubmitButton>
                          </div>
                        </ActionForm>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Add an item">
          <ActionForm action={createPackagingAction} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pk-name">Name</Label>
              <Input id="pk-name" name="name" placeholder="Compostable bag 500 g" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pk-kind">Kind</Label>
              <select id="pk-kind" name="kind" className={selectClass}>
                {PACKAGING_KINDS.map((k) => (
                  <option key={k} value={k} className="capitalize">{k}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pk-onHand">On hand</Label>
                <Input id="pk-onHand" name="onHand" type="number" min={0} defaultValue={0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pk-reorderAt">Reorder at</Label>
                <Input id="pk-reorderAt" name="reorderAt" type="number" min={0} defaultValue={0} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="compostable" defaultChecked className="accent-[var(--moss)]" /> Compostable
            </label>
            <SubmitButton>Add item</SubmitButton>
          </ActionForm>
          <p className="mt-4 text-xs text-muted-foreground">
            Link items to a product size from that product&apos;s page (bill of materials).
          </p>
        </Panel>
      </div>
    </main>
  );
}
