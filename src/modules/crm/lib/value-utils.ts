import type { GenericRow } from "../types"
import { PREVENTIVO_ACCEPTANCE_BASE_URL } from "./constants"
import { toStringValue } from "@/lib/value-utils"

export function asRowArray(input: unknown): GenericRow[] {
  if (!Array.isArray(input)) return []
  return input.filter(
    (item): item is GenericRow => Boolean(item) && typeof item === "object"
  )
}

export function displayValue(value: unknown): string {
  return toStringValue(value) ?? "-"
}

export function buildPreventivoAcceptanceUrl(sessionId: string | null) {
  if (!sessionId) return null

  const params = new URLSearchParams({
    utm_source: "whatsapp",
    utm_medium: "organic",
    utm_campaign: "whatsapp",
    utm_content: "reminder1",
    session_id: sessionId,
  })

  return `${PREVENTIVO_ACCEPTANCE_BASE_URL}?${params.toString()}`
}

export function buildAddressLine(address: GenericRow | undefined) {
  if (!address) return null

  const formatted = toStringValue(address.indirizzo_formattato)
  if (formatted) return formatted

  return (
    [
      toStringValue(address.via),
      toStringValue(address.civico),
      toStringValue(address.citta),
      toStringValue(address.cap),
    ]
      .filter((item): item is string => Boolean(item))
      .join(", ") || null
  )
}

export function getFlexibleStringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter((item): item is string => Boolean(item))
  }

  const single = toStringValue(value)
  if (!single) return []

  return single
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

// Ricava l'ordinale del tentativo più alto (es. "3° chiamata..." -> 3).
// Robusto sia alla scrittura cumulativa ("1°, 2°, 3°") sia a quella
// con singolo ordinale ("3°"): in entrambi i casi restituisce 3.
export function getCallAttemptCount(value: unknown): number {
  const items = getFlexibleStringArrayValue(value)
  let maxOrdinal = 0
  for (const item of items) {
    const match = item.match(/\d+/)
    if (match) {
      maxOrdinal = Math.max(maxOrdinal, Number(match[0]))
    }
  }
  // Fallback: se nessun ordinale è presente, usa il numero di voci.
  return maxOrdinal || items.length
}

export function parseIsoTime(value: string | null) {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

export function extractFirstNumberToken(value: unknown) {
  const raw = toStringValue(value)
  if (!raw) return null
  const match = raw.match(/\d+(?:[.,]\d+)?/)
  return match?.[0] ?? null
}
