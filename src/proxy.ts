import { NextResponse } from "next/server";

/**
 * Until Better Auth is wired in, the admin is open in development only.
 * In production it returns 404 unless ADMIN_OPEN=true is set deliberately.
 * Server actions post to the page URL, so they're covered by the matcher too.
 */
export function proxy() {
  if (process.env.NODE_ENV === "production" && process.env.ADMIN_OPEN !== "true") {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
