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

/** Nullable label variant for optional board-card fields (hide when empty). */
export function formatItalianCurrencyOrNull(
  value: number | null | undefined,
  options?: { minimumFractionDigits?: number },
): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Applies a nullable currency patch to an existing board-card label. */
export function formatItalianCurrencyLabelFromPatch(
  patchValue: number | null | undefined,
  previousLabel: string | null,
): string | null {
  if (typeof patchValue === "number") return formatItalianCurrencyOrNull(patchValue)
  if (patchValue === null) return null
  return previousLabel
}

/** Applies a nullable date patch to an existing board-card label. */
export function formatItalianDateLabelFromPatch(
  patchValue: string | null | undefined,
  previousLabel: string | null,
): string | null {
  if (typeof patchValue === "string") return formatItalianDateOrNull(patchValue)
  return previousLabel
}

/** Nullable label variant for optional board-card fields (hide when empty). */
export function formatItalianDateOrNull(value: unknown): string | null {
  const raw = toStringValue(value)
  if (!raw) return null
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
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
