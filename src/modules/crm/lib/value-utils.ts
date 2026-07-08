import type { GenericRow } from "../types"
import { PREVENTIVO_ACCEPTANCE_BASE_URL } from "./constants"

export function asRowArray(input: unknown): GenericRow[] {
  if (!Array.isArray(input)) return []
  return input.filter(
    (item): item is GenericRow => Boolean(item) && typeof item === "object"
  )
}

export function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized ? normalized : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

export function getFirstArrayValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = toStringValue(item)
      if (normalized) return normalized
    }
    return null
  }

  return toStringValue(value)
}

export function getStringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter((item): item is string => Boolean(item))
  }

  const single = toStringValue(value)
  return single ? [single] : []
}

export function toBooleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return null
    if (["true", "1", "si", "sì", "yes"].includes(normalized)) return true
    if (["false", "0", "no"].includes(normalized)) return false
  }
  return null
}

export function formatItalianDate(value: unknown): string {
  const raw = toStringValue(value)
  if (!raw) return "-"

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return "-"

  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

export function formatItalianDateTime(value: unknown): string {
  const raw = toStringValue(value)
  if (!raw) return "-"

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return "-"

  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
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

export function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}
