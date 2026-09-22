import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth-service";

export async function GET(req: Request) {
  try {
    const user = await getRequestSession(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("Session lookup failed:", error);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
