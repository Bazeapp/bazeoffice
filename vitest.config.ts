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
