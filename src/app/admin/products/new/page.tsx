import { connection } from "next/server";
import { PageHeader } from "@/components/admin/ui";
import type { ProductInput } from "@/domain/schemas";
import { GRINDS } from "@/domain/types";
import { appCtx } from "@/server/app-context";
import { ProductForm } from "../product-form";

export const metadata = { title: "New coffee" };

const blank: ProductInput = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  status: "draft",
  origin: { country: "", region: "", producer: "", altitudeM: null },
  process: "",
  varietal: "",
  roastLevel: "medium",
  tastingNotes: [],
  tags: [],
  greenLotId: null,
  grinds: [...GRINDS],
  taxable: false,
  variants: [],
};

export default async function NewProductPage() {
  await connection();
  const ctx = appCtx();
  const [lots, packaging] = await Promise.all([ctx.repo.greenLots.all(), ctx.repo.packaging.all()]);
  const bag = packaging.find((x) => x.name.includes("340 g"));
  const extras = packaging.filter((x) => /label|valve/i.test(x.name));
  const initial: ProductInput = {
    ...blank,
    variants: [
      {
        label: "340 g",
        sizeG: 340,
        priceCents: 2100,
        shipWeightG: 400,
        sku: "",
        active: true,
        bom: [bag, ...extras].filter((x) => x !== undefined).map((x) => ({ packagingItemId: x.id, qty: 1 })),
      },
    ],
  };

  return (
    <main>
      <PageHeader title="New coffee" description="Starts as a draft. Set it to active when it's ready for the store." />
      <div className="max-w-5xl p-6">
        <ProductForm
          initial={initial}
          lots={lots.map((l) => ({ id: l.id, label: `${l.code} · ${l.name}` }))}
          packaging={packaging.map((x) => ({ id: x.id, name: x.name }))}
        />
      </div>
    </main>
  );
}
