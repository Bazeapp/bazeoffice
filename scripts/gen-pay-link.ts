/**
 * Local helper: ensure every `mesi_lavorati` for a rapporto has a
 * `transazioni_finanziarie` row with a dummy `link_pagamento` that Controlli's
 * payment-link probe can treat as OK (GET → 200).
 *
 * Env (first match wins): process.env → `.env` → `e2e/.runtime-env.json`
 *   VITE_SUPABASE_URL
 *   LOCAL_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY (preferred) or VITE_SUPABASE_ANON_KEY
 *
 * Usage:
 *   bun run scripts/gen-pay-link.ts <rapporto_lavorativo_id>
 *   bun run scripts/gen-pay-link.ts <rapporto_lavorativo_id> --month 2026-07
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
/** Must return HTTP 200 on GET — Controlli follows redirects and fails on ≥400. */
const DUMMY_PAYMENT_URL = "https://example.com/"

type EnvBag = {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  LOCAL_SERVICE_ROLE_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

type CliArgs = {
  rapportoId: string | null
  month: string | null
  help: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { rapportoId: null, month: null, help: false }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    const next = argv[i + 1]
    if (token === "--help" || token === "-h") {
      args.help = true
    } else if (token === "--month" && next) {
      args.month = next
      i += 1
    } else if (!token.startsWith("--") && !args.rapportoId) {
      args.rapportoId = token
    }
  }

  return args
}

function printHelp() {
  console.log(`gen-pay-link.ts

Create/update a dummy payment link on transazioni_finanziarie for all
mesi_lavorati of a rapporto (so Controlli skips missing_payment_link).

  bun run scripts/gen-pay-link.ts <rapporto_lavorativo_id>
  bun run scripts/gen-pay-link.ts <rapporto_lavorativo_id> --month 2026-07

Flags:
  --month YYYY-MM   optional: only mesi whose calendario month matches
  -h, --help        show this help
`)
}

function loadDotEnv(filePath: string): EnvBag {
  if (!fs.existsSync(filePath)) return {}
  const out: EnvBag = {}
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    ;(out as Record<string, string>)[key] = value
  }
  return out
}

function loadRuntimeEnv(): EnvBag {
  const runtimePath = path.join(ROOT, "e2e", ".runtime-env.json")
  if (!fs.existsSync(runtimePath)) return {}
  try {
    return JSON.parse(fs.readFileSync(runtimePath, "utf8")) as EnvBag
  } catch {
    return {}
  }
}

function resolveEnv(): { supabaseUrl: string; apiKey: string } {
  const fromDotEnv = loadDotEnv(path.join(ROOT, ".env"))
  const fromRuntime = loadRuntimeEnv()
  const pick = (key: keyof EnvBag) =>
    process.env[key]?.trim() || fromDotEnv[key]?.trim() || fromRuntime[key]?.trim() || ""

  const supabaseUrl = pick("VITE_SUPABASE_URL").replace(/\/$/, "")
  const apiKey =
    pick("SUPABASE_SERVICE_ROLE_KEY") ||
    pick("LOCAL_SERVICE_ROLE_KEY") ||
    pick("VITE_SUPABASE_ANON_KEY")

  if (!supabaseUrl) {
    throw new Error("Missing VITE_SUPABASE_URL (.env or e2e/.runtime-env.json)")
  }
  if (!apiKey) {
    throw new Error(
      "Missing LOCAL_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY",
    )
  }

  return { supabaseUrl, apiKey }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

async function resolveMeseIdsForMonth(
  supabase: SupabaseClient,
  meseIds: string[],
  month: string,
): Promise<Set<string>> {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error(`Invalid --month "${month}". Expected YYYY-MM.`)
  }

  const { data, error } = await supabase
    .from("mesi_calendario")
    .select("id, data_inizio")
    .in("id", meseIds)

  if (error) throw new Error(`mesi_calendario fetch failed: ${error.message}`)

  const matched = new Set<string>()
  for (const row of data ?? []) {
    const start = typeof row.data_inizio === "string" ? row.data_inizio.slice(0, 7) : ""
    if (start === month) matched.add(row.id as string)
  }
  return matched
}

async function ensureDummyPayLink(
  supabase: SupabaseClient,
  meseLavorativoId: string,
): Promise<{ action: "created" | "updated" | "unchanged"; transazioneId: string }> {
  const { data: existing, error: fetchError } = await supabase
    .from("transazioni_finanziarie")
    .select("id, link_pagamento")
    .eq("mese_lavorativo_id", meseLavorativoId)
    .order("creato_il", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError) {
    throw new Error(`transazioni_finanziarie fetch failed: ${fetchError.message}`)
  }

  if (existing?.id) {
    if (existing.link_pagamento === DUMMY_PAYMENT_URL) {
      return { action: "unchanged", transazioneId: existing.id }
    }
    const { error: updateError } = await supabase
      .from("transazioni_finanziarie")
      .update({ link_pagamento: DUMMY_PAYMENT_URL })
      .eq("id", existing.id)
    if (updateError) {
      throw new Error(`transazioni_finanziarie update failed: ${updateError.message}`)
    }
    return { action: "updated", transazioneId: existing.id }
  }

  const { data: created, error: insertError } = await supabase
    .from("transazioni_finanziarie")
    .insert({
      mese_lavorativo_id: meseLavorativoId,
      link_pagamento: DUMMY_PAYMENT_URL,
      stato_pagamento: "da pagare",
    })
    .select("id")
    .single()

  if (insertError || !created?.id) {
    throw new Error(`transazioni_finanziarie insert failed: ${insertError?.message ?? "no id"}`)
  }

  return { action: "created", transazioneId: created.id }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  if (!args.rapportoId || !isUuid(args.rapportoId)) {
    printHelp()
    throw new Error("Pass a rapporto_lavorativo UUID, e.g. bun run scripts/gen-pay-link.ts <uuid>")
  }

  const env = resolveEnv()
  const supabase = createClient(env.supabaseUrl, env.apiKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: rapporto, error: rapportoError } = await supabase
    .from("rapporti_lavorativi")
    .select("id, richiesta_attivazione_id")
    .eq("id", args.rapportoId)
    .maybeSingle()

  if (rapportoError) throw new Error(`rapporti_lavorativi fetch failed: ${rapportoError.message}`)
  if (!rapporto) throw new Error(`No rapporti_lavorativi row for id=${args.rapportoId}`)

  const { data: mesi, error: mesiError } = await supabase
    .from("mesi_lavorati")
    .select("id, mese_id, stato_mese_lavorativo")
    .eq("rapporto_lavorativo_id", args.rapportoId)

  if (mesiError) throw new Error(`mesi_lavorati fetch failed: ${mesiError.message}`)

  let targets = mesi ?? []
  if (args.month) {
    const meseIds = targets.map((m) => m.mese_id).filter((id): id is string => Boolean(id))
    const matchedCalendarioIds = await resolveMeseIdsForMonth(supabase, meseIds, args.month)
    targets = targets.filter((m) => m.mese_id && matchedCalendarioIds.has(m.mese_id))
  }

  if (targets.length === 0) {
    console.log(
      `No mesi_lavorati for rapporto ${args.rapportoId}` +
        (args.month ? ` in month ${args.month}` : "") +
        ".",
    )
    return
  }

  console.log(
    `Rapporto ${args.rapportoId}` +
      (rapporto.richiesta_attivazione_id ? " (Baze Pay)" : " (no richiesta_attivazione)") +
      ` → ${targets.length} mese(i)`,
  )
  console.log(`Dummy URL: ${DUMMY_PAYMENT_URL}`)

  for (const mese of targets) {
    const result = await ensureDummyPayLink(supabase, mese.id)
    console.log(
      `  ${result.action.padEnd(9)} mese=${mese.id} stato=${mese.stato_mese_lavorativo ?? "?"} tx=${result.transazioneId}`,
    )
  }

  console.log("Done. Re-run Controlli analisi to clear missing_payment_link.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
