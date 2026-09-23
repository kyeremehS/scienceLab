import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getRequestId, logError } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const result = await db.execute(sql`SELECT 1`);

    return Response.json({
      status: "ok",
      database: "connected",
      result: result[0],
    });
  } catch (error) {
    logError(getRequestId(req), "Database health check failed", error);

    return Response.json(
      {
        status: "error",
        database: "disconnected",
      },
      { status: 503 },
    );
  }
}