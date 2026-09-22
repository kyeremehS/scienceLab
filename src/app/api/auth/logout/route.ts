import { NextResponse } from "next/server";
import { isSecureRequest, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req) || process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return res;
}
