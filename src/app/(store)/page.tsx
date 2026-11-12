import { GoblinMark } from "@/components/brand/goblin-mark";

const pillars = [
  {
    title: "Sourced with care",
    body: "Every lot is traceable to the farm or co-op that grew it, so you know where your cup comes from and who it supports.",
  },
  {
    title: "Roasted small, roasted fresh",
    body: "Small batches, roasted to order. Every bag carries its roast date.",
  },
  {
    title: "Lighter on the land",
    body: "Compostable packaging, a bag-return program, and local pickup to keep the footprint small.",
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
        <GoblinMark className="size-16 text-primary" />
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-clay">
          Small-batch coffee roaster
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold text-balance sm:text-6xl">
          Goblin Coffee
        </h1>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">
          Coffee from the forest floor up. Sustainably sourced and roasted in
          small batches.
        </p>
        <span className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
          Shop opening soon
        </span>
      </section>

      <section className="border-t border-border bg-secondary/60">
        <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-16 sm:grid-cols-3">
          {pillars.map((p) => (
            <article
              key={p.title}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h2 className="text-xl font-semibold">{p.title}</h2>
              <p className="mt-2 text-muted-foreground">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mt-auto border-t border-border px-4 py-8 text-center text-sm text-muted-foreground">
        © Goblin Coffee
      </footer>
    </main>
  );
}
