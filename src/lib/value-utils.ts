import type { LookupValueRecord } from "@/types"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuidValue(value: string) {
  return UUID_RE.test(value)
}

/** Numeric timestamp for sorting; null/invalid values sort last. */
export function getSortableTimestamp(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
}

export function indexRowsByStringId(
  rows: readonly Record<string, unknown>[],
  getId: (row: Record<string, unknown>) => string | null = (row) =>
    toStringValue(row.id),
) {
  const map = new Map<string, Record<string, unknown>>()
  for (const row of rows) {
    const rowId = getId(row)
    if (rowId) map.set(rowId, row)
  }
  return map
}

export function uniqueNonEmptyStrings(
  values: Array<string | null | undefined>,
) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
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

export function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}

export function normalizeComparableToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null
  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

export function readLookupSortOrder(value: LookupValueRecord["sort_order"]) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function indexRecordsById<TRecord extends { id: string }>(
  rows: readonly TRecord[],
) {
  return new Map(rows.map((row) => [row.id, row] as const))
}

export type RecordTicketIndex<TRecord extends { id: string; ticket_id?: string | null }> =
  {
    byId: Map<string, TRecord>
    byTicketId: Map<string, TRecord>
  }

export function indexRecordsByTicketId<
  TRecord extends { id: string; ticket_id?: string | null },
>(rows: readonly TRecord[]): RecordTicketIndex<TRecord> {
  const byId = indexRecordsById(rows)
  const byTicketId = new Map<string, TRecord>()

  for (const row of rows) {
    if (row.ticket_id) byTicketId.set(row.ticket_id, row)
  }

  return { byId, byTicketId }
}

export function getIndexedRecordByTicketId<
  TRecord extends { id: string; ticket_id?: string | null },
>(
  recordId: string | null | undefined,
  ticketId: string,
  index: RecordTicketIndex<TRecord>,
) {
  if (recordId) {
    const record = index.byId.get(recordId)
    if (record) return record
  }

  return index.byTicketId.get(ticketId) ?? null
}

export type LookupColorMap = Record<string, Record<string, string>>

export function buildLookupColorMap(rows: LookupValueRecord[]): LookupColorMap {
  return rows.reduce<LookupColorMap>((acc, current) => {
    if (!current.is_active) return acc
    const color = readLookupColor(current.metadata)
    if (!color) return acc

    const domain = `${current.entity_table}.${current.entity_field}`
    if (!acc[domain]) acc[domain] = {}

    acc[domain][normalizeLookupToken(current.value_key)] = color
    acc[domain][normalizeLookupToken(current.value_label)] = color
    return acc
  }, {})
}

export function resolveBadgeColor(
  lookupColors: LookupColorMap,
  entityTable: string,
  entityField: string,
  value: string | null,
) {
  if (!value) return null
  const domain = `${entityTable}.${entityField}`
  return lookupColors[domain]?.[normalizeLookupToken(value)] ?? null
}

/** First segment of an address note before "-", used as zona/quartiere shorthand. */
export function formatShortAddressNote(value: unknown): string | null {
  const note = toStringValue(value)
  return note?.split("-")[0]?.trim() || null
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

export function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim().replace(",", "."))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
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
