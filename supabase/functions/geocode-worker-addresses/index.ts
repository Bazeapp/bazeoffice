import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const TARGET_STATUSES = new Set(["qualificato", "idoneo", "certificato"])
const PRECISE_LOCATION_TYPES = new Set([
  "ROOFTOP",
  "RANGE_INTERPOLATED",
  "GEOMETRIC_CENTER",
])

type AddressRow = {
  id: string
  entita_id: string
  tipo_indirizzo: string | null
  via: string | null
  civico: string | null
  cap: string | null
  citta: string | null
  provincia: string | null
  paese: string | null
  indirizzo_formattato: string | null
  latitudine?: number | string | null
  longitudine?: number | string | null
}

type WorkerRow = {
  id: string
  stato_lavoratore: string | null
  provincia: string | null
}

type GeocodeResult = {
  lat: number
  lng: number
  placeId: string | null
  formattedAddress: string | null
  locationType: string | null
}

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null
  const parsed = Number.parseFloat(value.trim().replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

function hasValidCoordinates(row: AddressRow) {
  const lat = toFiniteNumber(row.latitudine)
  const lng = toFiniteNumber(row.longitudine)
  return lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

function addressRank(row: AddressRow) {
  const type = normalizeToken(row.tipo_indirizzo)
  if (type === "residenza") return 0
  if (type === "domicilio") return 1
  return 2
}

function buildAddressQuery(row: AddressRow, worker: WorkerRow | undefined) {
  const formatted = row.indirizzo_formattato?.trim()
  if (formatted) return formatted

  const parts = [
    row.via,
    row.civico,
    row.cap,
    row.citta,
    row.provincia ?? worker?.provincia,
    row.paese ?? "Italia",
  ]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)

  return parts.join(", ")
}

function isItalianResult(result: Record<string, unknown>) {
  const components = result.address_components
  if (!Array.isArray(components)) return false

  return components.some((component) => {
    if (!component || typeof component !== "object") return false
    const record = component as Record<string, unknown>
    return (
      record.short_name === "IT" &&
      Array.isArray(record.types) &&
      record.types.includes("country")
    )
  })
}

async function geocodeAddress(address: string, apiKey: string): Promise<GeocodeResult | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json")
  url.searchParams.set("address", address)
  url.searchParams.set("region", "it")
  url.searchParams.set("language", "it")
  url.searchParams.set("key", apiKey)

  const response = await fetch(url)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Google Geocoding failed: ${response.status} ${text}`)
  }

  const body = await response.json() as {
    status?: string
    error_message?: string
    results?: Array<Record<string, unknown>>
  }

  if (body.status !== "OK") {
    if (body.status === "ZERO_RESULTS") return null
    throw new Error(`Google Geocoding status ${body.status}: ${body.error_message ?? "-"}`)
  }

  const result = body.results?.[0]
  if (!result || !isItalianResult(result)) return null

  const geometry = result.geometry as Record<string, unknown> | undefined
  const location = geometry?.location as Record<string, unknown> | undefined
  const locationType =
    typeof geometry?.location_type === "string" ? geometry.location_type : null
  const lat = toFiniteNumber(location?.lat)
  const lng = toFiniteNumber(location?.lng)

  if (
    lat === null ||
    lng === null ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180 ||
    !locationType ||
    !PRECISE_LOCATION_TYPES.has(locationType)
  ) {
    return null
  }

  return {
    lat,
    lng,
    placeId: typeof result.place_id === "string" ? result.place_id : null,
    formattedAddress:
      typeof result.formatted_address === "string" ? result.formatted_address : null,
    locationType,
  }
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY")
    if (!apiKey) throw new Error("Missing GOOGLE_MAPS_API_KEY env var")

    const payload = await req.json().catch(() => ({})) as {
      dryRun?: boolean
      limit?: number
      scanLimit?: number
    }
    const dryRun = payload.dryRun !== false
    const limit = Math.max(1, Math.min(Number(payload.limit ?? 20), 100))
    const scanLimit = Math.max(limit, Math.min(Number(payload.scanLimit ?? 5000), 10000))

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { data: rawAddresses, error: addressesError } = await supabase
      .from("indirizzi")
      .select(
        "id, entita_id, tipo_indirizzo, via, civico, cap, citta, provincia, paese, indirizzo_formattato, latitudine, longitudine",
      )
      .eq("entita_tabella", "lavoratori")
      .not("via", "is", null)
      .or("latitudine.is.null,longitudine.is.null")
      .limit(scanLimit)

    if (addressesError) throw new Error(`Fetch indirizzi failed: ${addressesError.message}`)

    const byWorker = new Map<string, AddressRow>()
    for (const address of (rawAddresses ?? []) as AddressRow[]) {
      if (!address.entita_id || !address.via?.trim()) continue
      if (hasValidCoordinates(address)) continue

      const current = byWorker.get(address.entita_id)
      if (!current || addressRank(address) < addressRank(current)) {
        byWorker.set(address.entita_id, address)
      }
    }

    const workerIds = Array.from(byWorker.keys())
    const workersById = new Map<string, WorkerRow>()
    const workersWithCoordinates = new Set<string>()

    for (const batch of chunk(workerIds, 500)) {
      const [workersResult, geocodedResult] = await Promise.all([
        supabase
          .from("lavoratori")
          .select("id, stato_lavoratore, provincia")
          .in("id", batch),
        supabase
          .from("indirizzi")
          .select("entita_id, latitudine, longitudine")
          .eq("entita_tabella", "lavoratori")
          .in("entita_id", batch)
          .not("latitudine", "is", null)
          .not("longitudine", "is", null),
      ])

      if (workersResult.error) {
        throw new Error(`Fetch lavoratori failed: ${workersResult.error.message}`)
      }
      if (geocodedResult.error) {
        throw new Error(`Fetch existing coordinates failed: ${geocodedResult.error.message}`)
      }

      for (const worker of (workersResult.data ?? []) as WorkerRow[]) {
        workersById.set(worker.id, worker)
      }
      for (const address of (geocodedResult.data ?? []) as AddressRow[]) {
        if (address.entita_id && hasValidCoordinates(address)) {
          workersWithCoordinates.add(address.entita_id)
        }
      }
    }

    const candidates = workerIds
      .filter((workerId) => {
        const worker = workersById.get(workerId)
        return (
          worker &&
          TARGET_STATUSES.has(normalizeToken(worker.stato_lavoratore)) &&
          !workersWithCoordinates.has(workerId)
        )
      })
      .map((workerId) => byWorker.get(workerId))
      .filter((row): row is AddressRow => Boolean(row))
      .slice(0, limit)

    const results: Array<Record<string, unknown>> = []
    let updated = 0
    let skipped = 0
    let failed = 0

    for (const address of candidates) {
      const worker = workersById.get(address.entita_id)
      const query = buildAddressQuery(address, worker)
      if (!query) {
        skipped += 1
        results.push({ id: address.id, status: "skipped", reason: "empty query" })
        continue
      }

      try {
        const geocode = await geocodeAddress(query, apiKey)
        if (!geocode) {
          skipped += 1
          results.push({ id: address.id, workerId: address.entita_id, query, status: "skipped" })
          continue
        }

        if (!dryRun) {
          const { error: updateError } = await supabase
            .from("indirizzi")
            .update({
              latitudine: geocode.lat,
              longitudine: geocode.lng,
              place_id: geocode.placeId,
              indirizzo_formattato: geocode.formattedAddress,
            })
            .eq("id", address.id)

          if (updateError) throw new Error(updateError.message)
        }

        updated += 1
        results.push({
          id: address.id,
          workerId: address.entita_id,
          query,
          status: dryRun ? "would_update" : "updated",
          lat: geocode.lat,
          lng: geocode.lng,
          placeId: geocode.placeId,
          formattedAddress: geocode.formattedAddress,
          locationType: geocode.locationType,
        })
      } catch (error) {
        failed += 1
        results.push({
          id: address.id,
          workerId: address.entita_id,
          query,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return new Response(
      JSON.stringify({
        dryRun,
        scannedAddresses: rawAddresses?.length ?? 0,
        distinctWorkersWithVia: workerIds.length,
        candidates: candidates.length,
        updated,
        skipped,
        failed,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    )
  }
})
