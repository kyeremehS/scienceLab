import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

function dashboardFor(role: string): string {
  if (role === "TEACHER") return "/dashboard/teacher";
  if (role === "STUDENT") return "/dashboard/student";
  return "/";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value ?? null;
  const session = token ? await verifySessionToken(token) : null;

  const isDashboard = pathname.startsWith("/dashboard");
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isDashboard) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (pathname.startsWith("/dashboard/student") && session.role !== "STUDENT") {
      return NextResponse.redirect(new URL(dashboardFor(session.role), req.url));
    }
    if (pathname.startsWith("/dashboard/teacher") && session.role !== "TEACHER") {
      return NextResponse.redirect(new URL(dashboardFor(session.role), req.url));
    }
    return NextResponse.next();
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL(dashboardFor(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
