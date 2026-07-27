/**
 * Local helper to call the `wk-crea-cedolino` Edge Function (the same one
 * fired by DB trigger `trg_wk_crea_cedolino` when stato → "Ricezione presenze").
 *
 * That function only forwards `{ record_id }` to Make.com — it does NOT create
 * `mesi_lavorati` rows. Use `--seed` first if the Cedolini board is empty.
 *
 * Env (first match wins):
 *   process.env → `.env` → `e2e/.runtime-env.json` (from `npm run e2e` ensure)
 *
 * Required:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY (or LOCAL_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY)
 *   VITE_SUPABASE_FUNCTIONS_URL (optional; defaults to `${URL}/functions/v1`)
 *
 * Usage (pass script flags after npm's `--`):
 *   npm run script:wk-gen-cedolini -- --seed --month 2026-07
 *   npm run script:wk-gen-cedolini -- --invoke --month 2026-07
 *   npm run script:wk-gen-cedolini -- --record-id <uuid>
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

type EnvBag = {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  VITE_SUPABASE_FUNCTIONS_URL?: string
  LOCAL_SERVICE_ROLE_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

type CliArgs = {
  recordId: string | null
  seed: boolean
  invoke: boolean
  month: string | null
  rapportoId: string | null
  stato: string
  help: boolean
}

type ActiveRapporto = {
  id: string
  data_inizio_rapporto: string | null
  data_fine_rapporto: string | null
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PAGE_SIZE = 1000

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    recordId: null,
    seed: false,
    invoke: false,
    month: null,
    rapportoId: null,
    stato: "TODO",
    help: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    const next = argv[i + 1]
    if (token === "--help" || token === "-h") {
      args.help = true
    } else if (token === "--seed") {
      args.seed = true
    } else if (token === "--invoke") {
      args.invoke = true
    } else if (token === "--record-id" && next) {
      args.recordId = next
      i += 1
    } else if (token === "--month" && next) {
      args.month = next
      i += 1
    } else if (token === "--rapporto-id" && next) {
      args.rapportoId = next
      i += 1
    } else if (token === "--stato" && next) {
      args.stato = next
      i += 1
    } else if (!token.startsWith("--") && !args.recordId) {
      args.recordId = token
    }
  }

  return args
}

function printHelp() {
  console.log(`wk-gen-cedolini.ts

Invoke Edge Function wk-crea-cedolino, and/or seed mesi_lavorati for the
Cedolini board.

IMPORTANT: with npm, put flags after \`--\` so npm does not swallow them:
  npm run script:wk-gen-cedolini -- --invoke --month 2026-07
  ✗ npm run script:wk-gen-cedolini --invoke

By default --seed creates one mesi_lavorati per row in
rapporti_lavorativi_attivi that overlaps the target month.

Examples:
  npm run script:wk-gen-cedolini -- --seed --month 2026-07
  npm run script:wk-gen-cedolini -- --invoke --month 2026-07
  npm run script:wk-gen-cedolini -- --seed --month 2026-07 --invoke
  npm run script:wk-gen-cedolini -- --record-id <mesi_lavorati_uuid>

Flags:
  --record-id <uuid>     mesi_lavorati.id to pass to wk-crea-cedolino
  --seed                 insert mesi_calendario + presenze + mesi_lavorati
  --month YYYY-MM        month for --seed / --invoke
  --rapporto-id <uuid>   optional: seed only this rapporto (default = all active)
  --stato <label>        for --seed: initial stato (default TODO)
                         for --invoke alone: filter stato (default "Ricezione presenze")
  --invoke               call wk-crea-cedolino (with --seed: on seeded rows;
                         alone: on mesi_lavorati for --month matching --stato)
  -h, --help             show this help
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

function resolveEnv(): {
  supabaseUrl: string
  functionsUrl: string
  anonKey: string
  serviceRoleKey: string | null
} {
  const fromDotEnv = loadDotEnv(path.join(ROOT, ".env"))
  const fromRuntime = loadRuntimeEnv()
  const pick = (key: keyof EnvBag) =>
    process.env[key]?.trim() || fromDotEnv[key]?.trim() || fromRuntime[key]?.trim() || ""

  const supabaseUrl = pick("VITE_SUPABASE_URL").replace(/\/$/, "")
  const anonKey = pick("VITE_SUPABASE_ANON_KEY")
  const serviceRoleKey =
    pick("SUPABASE_SERVICE_ROLE_KEY") || pick("LOCAL_SERVICE_ROLE_KEY") || null
  const functionsUrl = (
    pick("VITE_SUPABASE_FUNCTIONS_URL") ||
    (supabaseUrl ? `${supabaseUrl}/functions/v1` : "")
  ).replace(/\/$/, "")

  if (!supabaseUrl) {
    throw new Error("Missing VITE_SUPABASE_URL (.env or e2e/.runtime-env.json)")
  }
  if (!anonKey && !serviceRoleKey) {
    throw new Error(
      "Missing VITE_SUPABASE_ANON_KEY or LOCAL_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY",
    )
  }
  if (!functionsUrl) {
    throw new Error("Missing VITE_SUPABASE_FUNCTIONS_URL")
  }

  return { supabaseUrl, functionsUrl, anonKey, serviceRoleKey }
}

function parseYearMonth(month: string): { year: number; month: number; start: string; end: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) {
    throw new Error(`Invalid --month "${month}". Expected YYYY-MM.`)
  }
  const year = Number(match[1])
  const monthNum = Number(match[2])
  if (monthNum < 1 || monthNum > 12) {
    throw new Error(`Invalid --month "${month}". Month must be 01–12.`)
  }
  const start = `${year}-${String(monthNum).padStart(2, "0")}-01`
  const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate()
  const end = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return { year, month: monthNum, start, end }
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

function overlapsMonth(
  rapporto: ActiveRapporto,
  monthStart: string,
  monthEnd: string,
): boolean {
  const start = rapporto.data_inizio_rapporto
  if (!start || start > monthEnd) return false
  const fine = rapporto.data_fine_rapporto
  if (fine && fine < monthStart) return false
  return true
}

async function invokeWkCreaCedolino(functionsUrl: string, apiKey: string, recordId: string) {
  const url = `${functionsUrl}/wk-crea-cedolino`
  console.log(`POST ${url} record_id=${recordId}`)

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      apikey: apiKey,
    },
    body: JSON.stringify({ record_id: recordId }),
  })

  const text = await response.text()
  let parsed: unknown = text
  try {
    parsed = JSON.parse(text)
  } catch {
    // keep raw text
  }

  if (!response.ok) {
    throw new Error(`wk-crea-cedolino failed (${response.status}): ${text}`)
  }

  console.log("OK", parsed)
}

async function ensureMeseCalendario(
  supabase: SupabaseClient,
  start: string,
  end: string,
  label: string,
): Promise<string> {
  const { data: existing, error: selectError } = await supabase
    .from("mesi_calendario")
    .select("id")
    .eq("data_inizio", start)
    .maybeSingle()

  if (selectError) {
    throw new Error(`mesi_calendario select failed: ${selectError.message}`)
  }
  if (existing?.id) {
    console.log(`Reusing mesi_calendario ${existing.id} (${start})`)
    return existing.id as string
  }

  const { data: created, error: insertError } = await supabase
    .from("mesi_calendario")
    .insert({
      data_inizio: start,
      data_fine: end,
      mese_lavorativo_copy: label,
    })
    .select("id")
    .single()

  if (insertError || !created?.id) {
    throw new Error(`mesi_calendario insert failed: ${insertError?.message ?? "no id"}`)
  }

  console.log(`Created mesi_calendario ${created.id} (${label})`)
  return created.id as string
}

async function fetchActiveRapporti(supabase: SupabaseClient): Promise<ActiveRapporto[]> {
  const rows: ActiveRapporto[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await supabase
      .from("rapporti_lavorativi_attivi")
      .select("id, data_inizio_rapporto, data_fine_rapporto")
      .order("id", { ascending: true })
      .range(from, to)

    if (error) {
      throw new Error(`rapporti_lavorativi_attivi select failed: ${error.message}`)
    }

    const page = (data ?? []) as ActiveRapporto[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

async function seedMeseLavoratoForRapporto(options: {
  supabase: SupabaseClient
  meseId: string
  month: string
  rapportoId: string
  stato: string
}): Promise<{ id: string; created: boolean }> {
  const { data: existingMl, error: existingError } = await options.supabase
    .from("mesi_lavorati")
    .select("id")
    .eq("mese_id", options.meseId)
    .eq("rapporto_lavorativo_id", options.rapportoId)
    .maybeSingle()

  if (existingError) {
    throw new Error(`mesi_lavorati select failed: ${existingError.message}`)
  }
  if (existingMl?.id) {
    return { id: existingMl.id as string, created: false }
  }

  const now = new Date().toISOString()

  const { data: presenzeRegolari, error: presenzeRegolariError } = await options.supabase
    .from("presenze_mensili")
    .insert({ creato_il: now, aggiornato_il: now })
    .select("id")
    .single()

  if (presenzeRegolariError || !presenzeRegolari?.id) {
    throw new Error(
      `presenze_mensili (regolari) insert failed: ${presenzeRegolariError?.message ?? "no id"}`,
    )
  }

  const { data: presenze, error: presenzeError } = await options.supabase
    .from("presenze_mensili")
    .insert({ creato_il: now, aggiornato_il: now })
    .select("id")
    .single()

  if (presenzeError || !presenze?.id) {
    throw new Error(`presenze_mensili insert failed: ${presenzeError?.message ?? "no id"}`)
  }

  const { data: meseLavorato, error: mlError } = await options.supabase
    .from("mesi_lavorati")
    .insert({
      mese_id: options.meseId,
      rapporto_lavorativo_id: options.rapportoId,
      presenze_id: presenze.id,
      presenze_regolare_id: presenzeRegolari.id,
      stato_mese_lavorativo: options.stato,
      data_ora_creazione: now,
      creato_il: now,
      aggiornato_il: now,
    })
    .select("id")
    .single()

  if (mlError || !meseLavorato?.id) {
    throw new Error(`mesi_lavorati insert failed: ${mlError?.message ?? "no id"}`)
  }

  return { id: meseLavorato.id as string, created: true }
}

async function seedMonthForActiveRapporti(options: {
  supabase: SupabaseClient
  month: string
  stato: string
  rapportoId: string | null
}): Promise<string[]> {
  const { year, month, start, end } = parseYearMonth(options.month)
  const label = monthLabel(year, month)
  const meseId = await ensureMeseCalendario(options.supabase, start, end, label)

  let rapporti: ActiveRapporto[]
  if (options.rapportoId) {
    const { data, error } = await options.supabase
      .from("rapporti_lavorativi")
      .select("id, data_inizio_rapporto, fine_rapporto_lavorativo_id")
      .eq("id", options.rapportoId)
      .maybeSingle()

    if (error) {
      throw new Error(`rapporti_lavorativi select failed: ${error.message}`)
    }
    if (!data) {
      throw new Error(`No rapporti_lavorativi row with id ${options.rapportoId}`)
    }

    let dataFine: string | null = null
    if (data.fine_rapporto_lavorativo_id) {
      const { data: chiusura, error: chiusuraError } = await options.supabase
        .from("chiusure_contratti")
        .select("data_fine_rapporto")
        .eq("id", data.fine_rapporto_lavorativo_id)
        .maybeSingle()
      if (chiusuraError) {
        throw new Error(`chiusure_contratti select failed: ${chiusuraError.message}`)
      }
      dataFine = (chiusura?.data_fine_rapporto as string | null | undefined) ?? null
    }

    rapporti = [
      {
        id: data.id as string,
        data_inizio_rapporto: (data.data_inizio_rapporto as string | null) ?? null,
        data_fine_rapporto: dataFine,
      },
    ]
  } else {
    rapporti = await fetchActiveRapporti(options.supabase)
  }

  const eligible = rapporti.filter((rapporto) => overlapsMonth(rapporto, start, end))
  console.log(
    options.rapportoId
      ? `Seeding 1 rapporto for ${options.month}`
      : `Found ${rapporti.length} active rapporti; ${eligible.length} overlap ${options.month}`,
  )

  if (eligible.length === 0) {
    throw new Error(
      options.rapportoId
        ? `Rapporto ${options.rapportoId} does not overlap ${options.month}`
        : `No active rapporti overlap ${options.month}`,
    )
  }

  let createdCount = 0
  let reusedCount = 0
  const ids: string[] = []

  for (const rapporto of eligible) {
    const result = await seedMeseLavoratoForRapporto({
      supabase: options.supabase,
      meseId,
      month: options.month,
      rapportoId: rapporto.id,
      stato: options.stato,
    })
    ids.push(result.id)
    if (result.created) {
      createdCount += 1
      console.log(`Created mesi_lavorati ${result.id} (rapporto ${rapporto.id})`)
    } else {
      reusedCount += 1
      console.log(`Reusing mesi_lavorati ${result.id} (rapporto ${rapporto.id})`)
    }
  }

  console.log(
    `Done: created=${createdCount} reused=${reusedCount} stato=${options.stato}. ` +
      `Open Cedolini board → ${options.month}.`,
  )
  return ids
}

async function findMesiLavoratiForInvoke(options: {
  supabase: SupabaseClient
  month: string
  stato: string
  rapportoId: string | null
}): Promise<string[]> {
  const { start } = parseYearMonth(options.month)

  const { data: mese, error: meseError } = await options.supabase
    .from("mesi_calendario")
    .select("id")
    .eq("data_inizio", start)
    .maybeSingle()

  if (meseError) {
    throw new Error(`mesi_calendario select failed: ${meseError.message}`)
  }
  if (!mese?.id) {
    throw new Error(`No mesi_calendario for ${options.month} (${start}). Seed first.`)
  }

  let query = options.supabase
    .from("mesi_lavorati")
    .select("id")
    .eq("mese_id", mese.id)
    .eq("stato_mese_lavorativo", options.stato)

  if (options.rapportoId) {
    query = query.eq("rapporto_lavorativo_id", options.rapportoId)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(`mesi_lavorati select failed: ${error.message}`)
  }

  return (data ?? []).map((row) => row.id as string)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const env = resolveEnv()
  const apiKey = env.serviceRoleKey ?? env.anonKey

  if (args.seed) {
    if (!args.month) {
      throw new Error("--seed requires --month YYYY-MM (omit --rapporto-id to seed all active)")
    }
    if (!env.serviceRoleKey) {
      console.warn(
        "Warning: no service-role key found; inserts may fail under RLS. " +
          "Prefer LOCAL_SERVICE_ROLE_KEY from e2e/.runtime-env.json.",
      )
    }

    const supabase = createClient(env.supabaseUrl, apiKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const recordIds = await seedMonthForActiveRapporti({
      supabase,
      month: args.month,
      stato: args.stato,
      rapportoId: args.rapportoId,
    })

    if (args.invoke) {
      for (const recordId of recordIds) {
        await invokeWkCreaCedolino(env.functionsUrl, apiKey, recordId)
      }
    } else if (args.recordId) {
      await invokeWkCreaCedolino(env.functionsUrl, apiKey, args.recordId)
    }
    return
  }

  if (args.invoke) {
    if (args.recordId) {
      await invokeWkCreaCedolino(env.functionsUrl, apiKey, args.recordId)
      return
    }
    if (!args.month) {
      printHelp()
      throw new Error(
        "With --invoke alone, pass --month YYYY-MM (and use npm's `--` before flags). " +
          "Example: npm run script:wk-gen-cedolini -- --invoke --month 2026-07",
      )
    }

    const supabase = createClient(env.supabaseUrl, apiKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const invokeStato =
      args.stato === "TODO" ? "Ricezione presenze" : args.stato
    const recordIds = await findMesiLavoratiForInvoke({
      supabase,
      month: args.month,
      stato: invokeStato,
      rapportoId: args.rapportoId,
    })

    if (recordIds.length === 0) {
      throw new Error(
        `No mesi_lavorati in "${invokeStato}" for ${args.month}. ` +
          `Move cards on the board, or pass --stato "<label>".`,
      )
    }

    console.log(`Invoking wk-crea-cedolino for ${recordIds.length} row(s) in "${invokeStato}"`)
    for (const recordId of recordIds) {
      await invokeWkCreaCedolino(env.functionsUrl, apiKey, recordId)
    }
    return
  }

  const recordId = args.recordId
  if (!recordId) {
    printHelp()
    throw new Error(
      "Pass --record-id <uuid>, or --invoke --month YYYY-MM, or --seed --month YYYY-MM. " +
        "With npm, put flags after `--`.",
    )
  }

  await invokeWkCreaCedolino(env.functionsUrl, apiKey, recordId)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
