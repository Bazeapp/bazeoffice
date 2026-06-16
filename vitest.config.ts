import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    globals: false,
    // happy-dom for everything: pure unit tests don't care, integration
    // tests (hooks + components) need DOM globals. happy-dom is lighter
    // and more stable than jsdom in 2025 (jsdom 29 has ESM regressions).
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    // supabase-client.ts throws at import time if these are unset. Tests mock
    // every network seam, so dummy values are enough — and they guarantee the
    // suite can never reach a real backend. Without this, CI (which has no
    // committed .env) fails to even load any test file that touches
    // supabase-client, while local runs pass because they pick up .env.
    env: {
      VITE_SUPABASE_URL: "http://localhost:54321",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
      VITE_SUPABASE_FUNCTIONS_URL: "http://localhost:54321/functions/v1",
    },
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.integration.test.ts",
      "src/**/*.integration.test.tsx",
    ],
    coverage: {
      include: ["src/lib/**", "src/hooks/**", "src/components/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
