import type { RealtimeRowEvent } from "@/hooks/use-realtime-rows"

import { toStringValue } from "./ricerca-detail-view.utils"

/** CDC tables that can change ricerca detail sidebar fields. */
export const RICERCA_DETAIL_REALTIME_TABLES = [
  "processi_matching",
  "famiglie",
  "indirizzi",
] as const

export type RicercaDetailRealtimeScope = {
  processId: string | null
  famigliaId: string | null
  indirizzoId: string | null
}

function rowId(row: Record<string, unknown> | null): string | null {
  return toStringValue(row?.id)
}

/**
 * Open ricerca detail reloads only for CDC rows belonging to the open process,
 * its family, or its process-linked address.
 */
export function shouldReloadRicercaOpenDetail(
  event: RealtimeRowEvent,
  scope: RicercaDetailRealtimeScope,
): boolean {
  const processId = toStringValue(scope.processId)
  if (!processId) return false

  if (event.table === "processi_matching") {
    const id = rowId(event.newRow) ?? rowId(event.oldRow)
    return id === processId
  }

  if (event.table === "famiglie") {
    const famigliaId = toStringValue(scope.famigliaId)
    if (!famigliaId || famigliaId === "-") return false
    const id = rowId(event.newRow) ?? rowId(event.oldRow)
    return id === famigliaId
  }

  if (event.table === "indirizzi") {
    const row = event.newRow ?? event.oldRow
    if (!row) return false

    const entitaTabella = toStringValue(row.entita_tabella)
    const entitaId = toStringValue(row.entita_id)
    if (entitaTabella === "processi_matching" && entitaId === processId) {
      return true
    }

    const indirizzoId = toStringValue(scope.indirizzoId)
    if (indirizzoId && rowId(row) === indirizzoId) return true

    return false
  }

  return false
}
