import fs from "node:fs/promises";
import path from "node:path";
import { safeLocalPath } from "@/server/adapters/storage";

/** Serves files written by the local storage driver (dev only). */
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
};

export async function GET(_req: Request, ctx: RouteContext<"/api/files/[...key]">) {
  const { key } = await ctx.params;
  try {
    const file = safeLocalPath(key.join("/"));
    const bytes = await fs.readFile(file);
    return new Response(bytes, {
      headers: {
        "Content-Type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
