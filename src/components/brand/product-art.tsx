import type { RoastLevel } from "@/domain/types";
import { cn } from "@/lib/utils";
import { GoblinMark } from "./goblin-mark";

const tones: Record<RoastLevel, string> = {
  light: "bg-[#dfe5d6] text-[#4a5d3a] dark:bg-[#2f3a27] dark:text-[#b6c4a6]",
  medium: "bg-[#ecdcc4] text-[#7a5c3e] dark:bg-[#3a2f24] dark:text-[#d9bf98]",
  medium_dark: "bg-[#e3cbb5] text-[#8a4a2a] dark:bg-[#3d2a1f] dark:text-[#d4875e]",
  dark: "bg-[#d6c3b0] text-[#3e2a1c] dark:bg-[#2e2119] dark:text-[#c9a98a]",
};

/** Image stand-in until real product photos are uploaded. */
export function ProductArt({
  roastLevel,
  imageUrl,
  alt,
  className,
}: {
  roastLevel: RoastLevel;
  imageUrl?: string | null;
  alt: string;
  className?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- local/S3 URLs, sizes unknown
      <img src={imageUrl} alt={alt} className={cn("aspect-square w-full object-cover", className)} />
    );
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("flex aspect-square w-full items-center justify-center", tones[roastLevel], className)}
    >
      <GoblinMark className="size-1/3 opacity-80" />
    </div>
  );
}
