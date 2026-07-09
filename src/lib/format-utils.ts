import { toStringValue } from "@/lib/value-utils"

/** Humanizes lookup/badge tokens for display (e.g. `part_time` -> `part time`). */
export function formatBadgeLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replaceAll("/", " / ")
    .replace(/\s+/g, " ")
    .trim()
}

export function formatItalianCurrency(
  value: number | null | undefined,
  options?: { emptyLabel?: string; minimumFractionDigits?: number },
) {
  const emptyLabel = options?.emptyLabel ?? "-"
  if (typeof value !== "number" || Number.isNaN(value)) return emptyLabel

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatItalianDateTimeOr(value: unknown, fallback: string) {
  const raw = toStringValue(value)
  if (!raw) return fallback

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw

  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}

export function toIsoDateInputValue(value: string | null | undefined) {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return parsed.toISOString().slice(0, 10)
}
