import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { appCtx } from "@/server/app-context";

export const metadata = { title: "Dev mailbox" };

export default async function MailboxPage({ searchParams }: PageProps<"/admin/dev/mailbox">) {
  await connection();
  const sp = await searchParams;
  const emails = (await appCtx().repo.outbox.all()).sort((a, b) => b.at.localeCompare(a.at));
  const selected = emails.find((e) => e.id === sp.id) ?? emails[0];

  return (
    <main className="flex h-dvh flex-col">
      <PageHeader title="Dev mailbox" description="Emails the app would have sent. Set EMAIL_DRIVER=resend to send for real." />
      {emails.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No emails yet. Place an order on the store to see one.</p>
      ) : (
        <div className="grid min-h-0 flex-1 md:grid-cols-[320px_1fr]">
          <ul className="overflow-y-auto border-r border-border">
            {emails.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/admin/dev/mailbox?id=${e.id}`}
                  className={cn("block border-b border-border px-4 py-3 text-sm hover:bg-muted", selected?.id === e.id && "bg-accent")}
                >
                  <span className="block truncate font-medium">{e.subject}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {e.to} · {formatDateTime(e.at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {selected && (
            <div className="flex min-h-[600px] flex-col">
              <div className="border-b border-border px-4 py-3 text-sm">
                <p><span className="text-muted-foreground">To:</span> {selected.to}</p>
                <p><span className="text-muted-foreground">Subject:</span> {selected.subject}</p>
              </div>
              <iframe title={selected.subject} srcDoc={selected.html} sandbox="" className="w-full flex-1 bg-white" />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
