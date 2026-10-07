import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

/**
 * Lazily created client: importing this module (e.g. during `next build`
 * route collection, where no database exists or env may hold placeholders)
 * must never throw. The connection is established on first real use, when
 * the runtime environment provides the actual DATABASE_URL.
 */
type DrizzleDb = ReturnType<typeof drizzle>;

let cached: DrizzleDb | null = null;

function real(): DrizzleDb {
  if (!cached) {
    cached = drizzle(postgres(process.env.DATABASE_URL!));
  }
  return cached;
}

export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    const value = (real() as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === "function" ? value.bind(real()) : value;
  },
});