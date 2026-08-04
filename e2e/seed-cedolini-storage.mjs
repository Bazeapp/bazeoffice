#!/usr/bin/env node
/**
 * Uploads Cedolini PDF fixtures to local Supabase Storage after db reset.
 * Invoked from e2e/ensure-supabase.mjs — requires e2e/.runtime-env.json.
 *
 * Creates `baze-bucket` when missing (local `db reset` does not recreate Storage
 * buckets from SQL seed).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const e2eDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(e2eDir, "fixtures", "cedolini")
const runtimeEnvPath = path.join(e2eDir, ".runtime-env.json")
const BUCKET = "baze-bucket"

const FIXTURES = [
  {
    file: "cedpag-example.pdf",
    objectPath: "mesi_lavorati/e2e/cedpag-example.pdf",
  },
  {
    file: "cedpag-chiusura-example.pdf",
    objectPath: "mesi_lavorati/e2e/cedpag-chiusura-example.pdf",
  },
]

function fail(message) {
  console.error(`\nE2E seed-cedolini-storage: ${message}\n`)
  process.exit(1)
}

function loadRuntimeEnv() {
  if (!fs.existsSync(runtimeEnvPath)) {
    fail(`Missing ${runtimeEnvPath}. Run ensure-supabase first.`)
  }
  return JSON.parse(fs.readFileSync(runtimeEnvPath, "utf8"))
}

function authHeaders(serviceRoleKey) {
  return {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  }
}

async function ensureBucket(baseUrl, serviceRoleKey) {
  const listResponse = await fetch(`${baseUrl}/storage/v1/bucket/${BUCKET}`, {
    method: "GET",
    headers: authHeaders(serviceRoleKey),
  })

  if (listResponse.ok) {
    console.log(`✓ Storage bucket "${BUCKET}" already exists`)
    return
  }

  if (listResponse.status !== 400 && listResponse.status !== 404) {
    const text = await listResponse.text()
    fail(`Could not inspect bucket "${BUCKET}": HTTP ${listResponse.status} ${text}`)
  }

  const createResponse = await fetch(`${baseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...authHeaders(serviceRoleKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: false,
      file_size_limit: 52_428_800,
    }),
  })

  if (!createResponse.ok) {
    const text = await createResponse.text()
    // Race / already created between GET and POST.
    if (createResponse.status === 409 || /already exists|Duplicate/i.test(text)) {
      console.log(`✓ Storage bucket "${BUCKET}" already exists`)
      return
    }
    fail(`Could not create bucket "${BUCKET}": HTTP ${createResponse.status} ${text}`)
  }

  console.log(`✓ Created Storage bucket "${BUCKET}"`)
}

export async function seedCedoliniStorage(runtimeEnv) {
  const baseUrl = String(runtimeEnv.VITE_SUPABASE_URL ?? "").replace(/\/$/, "")
  const serviceRoleKey = runtimeEnv.LOCAL_SERVICE_ROLE_KEY
  if (!baseUrl || !serviceRoleKey) {
    fail("VITE_SUPABASE_URL and LOCAL_SERVICE_ROLE_KEY required in runtime env.")
  }

  await ensureBucket(baseUrl, serviceRoleKey)

  for (const fixture of FIXTURES) {
    const localPath = path.join(fixturesDir, fixture.file)
    if (!fs.existsSync(localPath)) {
      fail(
        `Missing fixture ${localPath}. Copy the sample PDFs into e2e/fixtures/cedolini/.`,
      )
    }

    const body = fs.readFileSync(localPath)
    const url = `${baseUrl}/storage/v1/object/${BUCKET}/${fixture.objectPath}`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...authHeaders(serviceRoleKey),
        "Content-Type": "application/pdf",
        "x-upsert": "true",
      },
      body,
    })

    if (!response.ok) {
      const text = await response.text()
      fail(`Upload failed for ${fixture.file}: HTTP ${response.status} ${text}`)
    }

    console.log(`✓ Uploaded ${fixture.file} → ${BUCKET}/${fixture.objectPath}`)
  }
}

async function main() {
  const runtimeEnv = loadRuntimeEnv()
  await seedCedoliniStorage(runtimeEnv)
}

const isDirectRun =
  process.argv[1] != null &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])

if (isDirectRun) {
  main().catch((error) => {
    fail(error instanceof Error ? error.message : String(error))
  })
}
