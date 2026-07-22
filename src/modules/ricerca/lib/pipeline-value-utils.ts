import type { GenericRow } from "../types/workers-pipeline"

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
export function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim().replace(",", "."))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}
export function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}
