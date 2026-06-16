// Next.js 16 renamed Middleware to Proxy. Locale is cookie-based (no routing),
// so the proxy's only job is an optimistic auth gate for /admin (cookie-only
// check — real authorization happens server-side via requireAdmin()).
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decryptSession } from "./lib/session";
import { Role } from "./generated/prisma/enums";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect every /admin route except the admin login page itself.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const session = await decryptSession(
      req.cookies.get(SESSION_COOKIE)?.value,
    );
    if (session?.role !== Role.ADMIN) {
      return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
