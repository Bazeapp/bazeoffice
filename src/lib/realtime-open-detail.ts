import type { RealtimeRowEvent } from "@/hooks/use-realtime-rows"

function readRowId(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null
  const id = row.id
  if (typeof id === "string" && id.trim()) return id.trim()
  if (typeof id === "number" && Number.isFinite(id)) return String(id)
  return null
}

function readFk(
  row: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): string | null {
  if (!row) return null
  for (const key of keys) {
    const value = row[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return null
}

/**
 * True when a CDC event targets the currently open detail record.
 * Matches the event row `id`, or any of the given FK columns, against
 * `openDetailId`.
 */
export function eventMatchesOpenDetailId(
  event: RealtimeRowEvent,
  openDetailId: string | null,
  fkKeys: readonly string[] = ["rapporto_id", "rapporto_lavorativo_id"],
): boolean {
  if (!openDetailId) return false
  return eventMatchesOpenDetailIds(event, new Set([openDetailId]), fkKeys)
}

/**
 * Same as {@link eventMatchesOpenDetailId} but accepts every id that should
 * refresh the open sheet (card id + related rapporto/famiglia/lavoratore ids).
 */
export function eventMatchesOpenDetailIds(
  event: RealtimeRowEvent,
  openIds: ReadonlySet<string>,
  fkKeys: readonly string[] = ["rapporto_id", "rapporto_lavorativo_id"],
): boolean {
  if (openIds.size === 0) return false
  const rowId = readRowId(event.newRow) ?? readRowId(event.oldRow)
  if (rowId && openIds.has(rowId)) return true
  const fk = readFk(event.newRow, fkKeys) ?? readFk(event.oldRow, fkKeys)
  return fk != null && openIds.has(fk)
}

/**
 * Board reload for a secondary table (e.g. rapporti on prove-colloqui):
 * INSERT/DELETE always reload (membership may change); UPDATE only when the
 * row is already visible on the board.
 */
export function shouldReloadBoardForVisibleRow(
  event: RealtimeRowEvent,
  options: {
    table: string
    visibleIds: ReadonlySet<string>
  },
): boolean {
  if (event.table !== options.table) return true
  if (event.eventType === "INSERT" || event.eventType === "DELETE") return true
  const rowId = readRowId(event.newRow) ?? readRowId(event.oldRow)
  if (!rowId) return true
  return options.visibleIds.has(rowId)
}
