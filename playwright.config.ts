import { defineConfig, devices } from "@playwright/test"

import {
  BASE_PATH,
  OPERATORS,
  OPERATOR_ROLES,
  getAppOrigin,
  getViteEnv,
} from "./e2e/constants"

const useDevServer = process.env.E2E_WEB_SERVER === "dev"
const appUrl = `${getAppOrigin()}${BASE_PATH}`

const webServerEnv = {
  ...process.env,
  ...getViteEnv(),
  ...(useDevServer ? { VITE_DISABLE_STRICT_MODE: "true" } : {}),
}

const SHARED_TEST_MATCH = "shared/**/*.spec.ts"

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: appUrl,
    trace: "on-first-retry",
  },
  projects: OPERATOR_ROLES.map((role) => ({
    name: role,
    testMatch: [SHARED_TEST_MATCH, `${role}/**/*.spec.ts`],
    use: {
      storageState: OPERATORS[role].storageStatePath,
    },
  })),
  webServer: {
    command: useDevServer
      ? "npm run dev:nostrict -- --host 127.0.0.1 --port 5173"
      : "npm run build && npm run preview -- --host 127.0.0.1 --port 4173",
    url: appUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: webServerEnv,
  },
})
