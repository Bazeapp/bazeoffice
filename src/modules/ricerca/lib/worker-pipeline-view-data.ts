import { fetchFamiglieByIds } from "@/modules/crm/queries"
import { fetchProcessiMatchingByIds } from "../queries/fetch-processi-matching-by-ids"
import { fetchSelezioniLookup } from "../queries/fetch-selezioni-lookup"
import {
  RELATED_FAMILY_BATCH_SIZE,
  RELATED_PROCESS_BATCH_SIZE,
} from "./worker-pipeline-view-utils"

export async function fetchAllSelectionsForWorker(workerId: string) {
  const result = await fetchSelezioniLookup({ lavoratoreIds: [workerId] })
  return Array.isArray(result.rows)
    ? (result.rows as Record<string, unknown>[])
    : []
}

export async function fetchRelatedProcessesByIds(processIds: string[]) {
  if (processIds.length === 0) return []

  const rows: Record<string, unknown>[] = []

  for (
    let index = 0;
    index < processIds.length;
    index += RELATED_PROCESS_BATCH_SIZE
  ) {
    const batch = processIds.slice(index, index + RELATED_PROCESS_BATCH_SIZE)
    const result = await fetchProcessiMatchingByIds({ ids: batch })

    if (Array.isArray(result.rows)) {
      rows.push(...(result.rows as Record<string, unknown>[]))
    }
  }

  return rows
}

export async function fetchRelatedFamiliesByIds(familyIds: string[]) {
  if (familyIds.length === 0) return []

  const rows: Record<string, unknown>[] = []

  for (
    let index = 0;
    index < familyIds.length;
    index += RELATED_FAMILY_BATCH_SIZE
  ) {
    const batch = familyIds.slice(index, index + RELATED_FAMILY_BATCH_SIZE)
    const result = await fetchFamiglieByIds(batch)

    if (Array.isArray(result.rows)) {
      rows.push(...(result.rows as Record<string, unknown>[]))
    }
  }

  return rows
}
