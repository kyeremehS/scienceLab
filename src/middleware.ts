import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { REQUEST_ID_HEADER } from "@/lib/logger";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** Stamp correlation + hardening headers on any outgoing response. */
function stamp(res: NextResponse, requestId: string): NextResponse {
  res.headers.set(REQUEST_ID_HEADER, requestId);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "same-origin");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

function dashboardFor(role: string): string {
  if (role === "TEACHER") return "/dashboard/teacher";
  if (role === "STUDENT") return "/dashboard/student";
  return "/";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = crypto.randomUUID();
  const token = req.cookies.get(SESSION_COOKIE)?.value ?? null;
  const session = token ? await verifySessionToken(token) : null;

  const isDashboard = pathname.startsWith("/dashboard");
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  if (isDashboard) {
    if (!session) {
      return stamp(NextResponse.redirect(new URL("/login", req.url)), requestId);
    }
    if (pathname.startsWith("/dashboard/student") && session.role !== "STUDENT") {
      return stamp(NextResponse.redirect(new URL(dashboardFor(session.role), req.url)), requestId);
    }
    if (pathname.startsWith("/dashboard/teacher") && session.role !== "TEACHER") {
      return stamp(NextResponse.redirect(new URL(dashboardFor(session.role), req.url)), requestId);
    }
    return stamp(NextResponse.next(), requestId);
  }

  if (isAuthPage && session) {
    return stamp(NextResponse.redirect(new URL(dashboardFor(session.role), req.url)), requestId);
  }

  return stamp(NextResponse.next(), requestId);
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register", "/forgot-password", "/reset-password"],
};
