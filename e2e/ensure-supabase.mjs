#!/usr/bin/env node
/**
 * Starts local Supabase (sibling baze-supabase repo), resets + seeds the DB,
 * and writes e2e/.runtime-env.json for Playwright (keys from `supabase status`).
 *
 * Override backend path: SUPABASE_WORKDIR=/path/to/baze-supabase
 */

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "url"

const e2eDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(e2eDir, "..")
const defaultWorkdir = path.resolve(repoRoot, "..", "baze-supabase")
const workdir = path.resolve(process.env.SUPABASE_WORKDIR ?? defaultWorkdir)
const runtimeEnvPath = path.join(e2eDir, ".runtime-env.json")

function fail(message) {
  console.error(`\nE2E ensure-supabase: ${message}\n`)
  process.exit(1)
}

function assertSupabaseCli() {
  const check = spawnSync("supabase", ["--version"], { encoding: "utf8" })
  if (check.error?.code === "ENOENT" || check.status !== 0) {
    fail(
      "Supabase CLI not found. Install: https://supabase.com/docs/guides/cli/getting-started",
    )
  }
}

function assertWorkdir() {
  if (!fs.existsSync(path.join(workdir, "supabase", "config.toml"))) {
    fail(
      `No supabase/config.toml in ${workdir}. ` +
        "Set SUPABASE_WORKDIR to your backend-supabase checkout.",
    )
  }
}

function runSupabase(args, { capture = false } = {}) {
  const result = spawnSync("supabase", args, {
    cwd: workdir,
    stdio: capture ? "pipe" : "inherit",
    encoding: "utf8",
  })

  if (result.error) {
    fail(result.error.message)
  }
  if (result.status !== 0) {
    fail(`supabase ${args.join(" ")} failed (exit ${result.status})`)
  }

  return result
}

function pickFirst(obj, keys) {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return null
}

function parseStatus(stdout) {
  let status
  try {
    status = JSON.parse(stdout)
  } catch {
    fail("Could not parse `supabase status -o json` output")
  }

  const apiUrl =
    pickFirst(status, ["API_URL", "apiUrl"]) ?? "http://127.0.0.1:54321"
  const anonKey = pickFirst(status, [
    "ANON_KEY",
    "PUBLISHABLE_KEY",
    "anon_key",
    "publishable_key",
  ])
  const serviceRoleKey = pickFirst(status, [
    "SERVICE_ROLE_KEY",
    "SECRET_KEY",
    "service_role_key",
    "secret_key",
  ])

  if (!anonKey) {
    fail(
      "No publishable/anon key in `supabase status -o json`. Is the stack running?",
    )
  }
  if (!serviceRoleKey) {
    fail(
      "No service-role/secret key in `supabase status -o json`. Is the stack running?",
    )
  }

  const baseUrl = apiUrl.replace(/\/$/, "")
  return {
    VITE_SUPABASE_URL: baseUrl,
    VITE_SUPABASE_ANON_KEY: anonKey,
    VITE_SUPABASE_FUNCTIONS_URL: `${baseUrl}/functions/v1`,
    LOCAL_SERVICE_ROLE_KEY: serviceRoleKey,
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function tryStartEdgeRuntimeContainer() {
  const result = spawnSync(
    "docker",
    ["ps", "-a", "--filter", "name=supabase_edge_runtime", "--format", "{{.Names}}"],
    { encoding: "utf8" },
  )

  if (result.status !== 0) {
    return false
  }

  const containerNames = result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  if (containerNames.length === 0) {
    return false
  }

  for (const name of containerNames) {
    spawnSync("docker", ["start", name], { encoding: "utf8" })
  }

  return true
}

async function ensureEdgeFunctionsReady(runtimeEnv) {
  const probeUrl = `${runtimeEnv.VITE_SUPABASE_URL}/functions/v1/lookup-values`
  const maxAttempts = 8

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(probeUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${runtimeEnv.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: true }),
      })

      if (response.ok) {
        console.log("✓ Edge functions ready (lookup-values)")
        return
      }

      console.warn(
        `E2E ensure-supabase: lookup-values probe returned HTTP ${response.status} (attempt ${attempt}/${maxAttempts})`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(
        `E2E ensure-supabase: lookup-values probe failed (attempt ${attempt}/${maxAttempts}): ${message}`,
      )
    }

    if (attempt < maxAttempts) {
      console.log("→ starting edge runtime container (if stopped)")
      tryStartEdgeRuntimeContainer()
      await sleep(2_000)
    }
  }

  fail(
    "Edge functions are not reachable (lookup-values). " +
      "Run `supabase stop && supabase start` in your baze-supabase checkout, " +
      "or ensure Docker can start `supabase_edge_runtime_*`.",
  )
}

function main() {
  assertSupabaseCli()
  assertWorkdir()

  console.log(`E2E ensure-supabase: using ${workdir}\n`)

  console.log("→ supabase start")
  runSupabase(["start"])

  console.log("\n→ supabase db reset")
  runSupabase(["db", "reset"])

  console.log("\n→ supabase status")
  const { stdout } = runSupabase(["status", "-o", "json"], { capture: true })
  const runtimeEnv = parseStatus(stdout)

  fs.writeFileSync(runtimeEnvPath, `${JSON.stringify(runtimeEnv, null, 2)}\n`)
  console.log(`\n✓ Wrote ${runtimeEnvPath}`)
  console.log(`  API: ${runtimeEnv.VITE_SUPABASE_URL}`)

  return runtimeEnv
}

async function run() {
  const runtimeEnv = main()
  console.log("\n→ edge functions health check")
  await ensureEdgeFunctionsReady(runtimeEnv)
}

run().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})
