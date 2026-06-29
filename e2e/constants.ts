import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Local Supabase + E2E fixture constants.
 *
 * Keys are populated automatically by `e2e/ensure-supabase.mjs` into
 * `e2e/.runtime-env.json` before Playwright runs. Manual override: set
 * VITE_SUPABASE_* env vars or run ensure-supabase first.
 */

const e2eDir = path.dirname(fileURLToPath(import.meta.url))
const RUNTIME_ENV_PATH = path.join(e2eDir, ".runtime-env.json")

const DEFAULT_SUPABASE_URL = "http://127.0.0.1:54321"
const DEFAULT_FUNCTIONS_URL = "http://127.0.0.1:54321/functions/v1"

type RuntimeEnv = {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  VITE_SUPABASE_FUNCTIONS_URL: string
  LOCAL_SERVICE_ROLE_KEY: string
}

let cachedConfig: RuntimeEnv | null = null

function loadRuntimeEnvFile(): RuntimeEnv | null {
  if (!fs.existsSync(RUNTIME_ENV_PATH)) {
    return null
  }
  return JSON.parse(fs.readFileSync(RUNTIME_ENV_PATH, "utf8")) as RuntimeEnv
}

export function getLocalSupabaseConfig(): RuntimeEnv {
  if (cachedConfig) {
    return cachedConfig
  }

  const fromFile = loadRuntimeEnvFile()

  cachedConfig = {
    VITE_SUPABASE_URL:
      process.env.VITE_SUPABASE_URL ??
      fromFile?.VITE_SUPABASE_URL ??
      DEFAULT_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY:
      process.env.VITE_SUPABASE_ANON_KEY ??
      fromFile?.VITE_SUPABASE_ANON_KEY ??
      "",
    VITE_SUPABASE_FUNCTIONS_URL:
      process.env.VITE_SUPABASE_FUNCTIONS_URL ??
      fromFile?.VITE_SUPABASE_FUNCTIONS_URL ??
      DEFAULT_FUNCTIONS_URL,
    LOCAL_SERVICE_ROLE_KEY:
      process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ??
      fromFile?.LOCAL_SERVICE_ROLE_KEY ??
      "",
  }

  return cachedConfig
}

export const PREVIEW_HOST = "127.0.0.1"
export const PREVIEW_PORT = 4173
export const DEV_PORT = 5173
export const BASE_PATH = "/bazeoffice/"
export const PREVIEW_ORIGIN = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`

/**
 * Active app origin for the current run: the Vite dev server (DEV_PORT) when
 * `E2E_WEB_SERVER=dev`, otherwise the preview build (PREVIEW_PORT). The
 * storageState origin (global-setup) and Playwright `baseURL` must both derive
 * from this — Playwright injects storageState localStorage only into a matching
 * origin, so a hardcoded origin breaks auth on the other server.
 */
export function getAppPort() {
  return process.env.E2E_WEB_SERVER === "dev" ? DEV_PORT : PREVIEW_PORT
}

export function getAppOrigin() {
  return `http://${PREVIEW_HOST}:${getAppPort()}`
}

export const OPERATOR_ROLES = [
  "customer",
  "sales",
  "recruiter",
  "payroll",
] as const

export type OperatorRole = (typeof OPERATOR_ROLES)[number]

const E2E_PASSWORD = "password123"

export const OPERATORS: Record<
  OperatorRole,
  { email: string; password: string; storageStatePath: string }
> = {
  customer: {
    email: "e2e-customer@local.test",
    password: E2E_PASSWORD,
    storageStatePath: "e2e/.auth/customer.json",
  },
  sales: {
    email: "e2e-sales@local.test",
    password: E2E_PASSWORD,
    storageStatePath: "e2e/.auth/sales.json",
  },
  recruiter: {
    email: "e2e-recruiter@local.test",
    password: E2E_PASSWORD,
    storageStatePath: "e2e/.auth/recruiter.json",
  },
  payroll: {
    email: "e2e-payroll@local.test",
    password: E2E_PASSWORD,
    storageStatePath: "e2e/.auth/payroll.json",
  },
}

/** Seeded in baze-supabase/supabase/seed_e2e_famiglia.sql */
export const E2E_FAMIGLIA = {
  id: "00000000-0000-0000-0000-00000000f001",
  nome: "E2E",
  cognome: "Famiglia Rossi",
  displayName: "Famiglia Rossi",
  searchText: "Famiglia Rossi",
  processoId: "00000000-0000-0000-0000-00000000b001",
} as const

export function getViteEnv() {
  const config = getLocalSupabaseConfig()
  return {
    VITE_SUPABASE_URL: config.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: config.VITE_SUPABASE_ANON_KEY,
    VITE_SUPABASE_FUNCTIONS_URL: config.VITE_SUPABASE_FUNCTIONS_URL,
  }
}

export function assertLocalKeysConfigured() {
  const config = getLocalSupabaseConfig()
  if (!config.VITE_SUPABASE_ANON_KEY) {
    throw new Error(
      "E2E: missing Supabase anon/publishable key. Run `npm run e2e` (runs ensure-supabase) or `node e2e/ensure-supabase.mjs` first.",
    )
  }
  if (!config.LOCAL_SERVICE_ROLE_KEY) {
    throw new Error(
      "E2E: missing Supabase service-role key. Run `node e2e/ensure-supabase.mjs` first.",
    )
  }
}
