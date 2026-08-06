import type { RealtimeRowEvent } from "@/hooks/use-realtime-rows"

import { asString } from "./base-utils"
import { LAVORATORI_BOARD_REALTIME_TABLE } from "./list-constants"

/** Related CDC tables whose row `id` is not the worker id. */
const RELATED_WORKER_ID_KEYS = ["lavoratore_id", "entita_id"] as const

function readRowWorkerId(row: Record<string, unknown> | null): string | null {
  if (!row) return null
  for (const key of RELATED_WORKER_ID_KEYS) {
    const value = asString(row[key])
    if (value) return value
  }
  return null
}

/**
 * Resolve the lavoratore id an event is about.
 * - `lavoratori`: row id
 * - `indirizzi`: `entita_id` when `entita_tabella` is lavoratori (or unset)
 * - experience / reference / document / selezione: `lavoratore_id`
 */
export function resolveLavoratoriRealtimeWorkerId(
  event: RealtimeRowEvent
): string | null {
  if (event.table === LAVORATORI_BOARD_REALTIME_TABLE) {
    return asString(event.newRow?.id ?? event.oldRow?.id) || null
  }

  if (event.table === "indirizzi") {
    const row = event.newRow ?? event.oldRow
    const entitaTabella = asString(row?.entita_tabella)
    if (entitaTabella && entitaTabella !== "lavoratori") return null
    return readRowWorkerId(event.newRow) ?? readRowWorkerId(event.oldRow)
  }

  return readRowWorkerId(event.newRow) ?? readRowWorkerId(event.oldRow)
}

/**
 * Board list reloads only for `lavoratori` membership / visible-row events.
 * Related-table CDC must not thrash the full list (detail uses Pattern B).
 */
export function shouldReloadLavoratoriBoard(
  event: RealtimeRowEvent,
  options: {
    selectedWorkerId: string | null
    visibleWorkerIds: ReadonlyArray<string>
  }
): boolean {
  if (event.table !== LAVORATORI_BOARD_REALTIME_TABLE) return false

  // Inserts/deletes can change membership and totals for the current filter.
  if (event.eventType === "INSERT" || event.eventType === "DELETE") return true

  const rowId = asString(event.newRow?.id ?? event.oldRow?.id)
  if (!rowId) return true
  if (options.selectedWorkerId === rowId) return true
  return options.visibleWorkerIds.some((id) => id === rowId)
}

/** Open scheda reloads when the event targets the currently selected worker. */
export function shouldReloadLavoratoriOpenDetail(
  event: RealtimeRowEvent,
  selectedWorkerId: string | null
): boolean {
  if (!selectedWorkerId) return false
  const workerId = resolveLavoratoriRealtimeWorkerId(event)
  return workerId === selectedWorkerId
}
