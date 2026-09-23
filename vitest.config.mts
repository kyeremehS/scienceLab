import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname + "/src",
    },
  },
  test: {
    // Playwright owns e2e/** (pnpm test:e2e); Vitest must not load those files.
    exclude: ["node_modules", "e2e/**"],
  },
});
