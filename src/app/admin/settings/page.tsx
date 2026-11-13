import { connection } from "next/server";
import { PageHeader } from "@/components/admin/ui";
import { appCtx } from "@/server/app-context";
import { getSettings } from "@/server/services/settings";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  const settings = await getSettings(appCtx());
  return (
    <main>
      <PageHeader title="Settings" description="Payments, delivery options, shipping rates and tax." />
      <div className="max-w-4xl p-6">
        <SettingsForm initial={settings} />
      </div>
    </main>
  );
}
