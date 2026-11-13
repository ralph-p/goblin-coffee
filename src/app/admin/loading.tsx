export default function Loading() {
  return (
    <div className="p-8">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
