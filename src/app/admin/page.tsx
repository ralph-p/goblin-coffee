// Admin dashboard placeholder. Phase 1 adds Better Auth + requireAdmin()
// gating, then products, orders, roast logs and inventory (see docs/ROADMAP.md).
export const metadata = { title: "Admin" };

export default function AdminHome() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Roastery dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Orders, roast logs, green inventory and packaging will live here.
      </p>
    </main>
  );
}
