import { defineConfig } from "@playwright/test";

/**
 * End-to-end suite. Runs against an isolated database (sciencelab_e2e) so
 * journeys never touch dev data. Prepare it once with:
 *
 *   docker exec sciencelab-postgres psql -U sciencelab -d postgres -c "CREATE DATABASE sciencelab_e2e;"
 *   $env:DATABASE_URL="postgresql://sciencelab:sciencelab_dev@localhost:5432/sciencelab_e2e"
 *   pnpm drizzle-kit migrate; pnpm db:seed
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120000,
  // Generous assertions: a cold Next dev server compiles routes on first hit.
  expect: { timeout: 45000 },
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "pnpm dev --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
    env: {
      DATABASE_URL: "postgresql://sciencelab:sciencelab_dev@localhost:5432/sciencelab_e2e",
      SESSION_SECRET: "e2e-test-secret-change-me-000000000000",
      // Empty on purpose: the AI helper must exercise its offline fallback
      // in E2E so runs stay deterministic (and free).
      OPENROUTER_API_KEY: "",
    },
  },
});
