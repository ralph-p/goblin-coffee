import "server-only";
import { cookies } from "next/headers";
import { parseCart, type CartLine } from "@/domain/cart";

const COOKIE = "gc_cart";

export async function readCart(): Promise<CartLine[]> {
  return parseCart((await cookies()).get(COOKIE)?.value);
}

/** Only callable from server actions / route handlers. */
export async function writeCart(lines: CartLine[]) {
  const jar = await cookies();
  if (lines.length === 0) {
    jar.delete(COOKIE);
    return;
  }
  jar.set(COOKIE, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
