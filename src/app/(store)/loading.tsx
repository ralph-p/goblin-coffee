import { GoblinMark } from "@/components/brand/goblin-mark";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
      <GoblinMark className="size-10 animate-pulse text-primary" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
