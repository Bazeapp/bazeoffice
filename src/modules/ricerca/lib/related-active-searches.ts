import type { WorkerOtherSelectionSummaryItem } from "@/modules/lavoratori/components/lavoratore-card"
import { asString, isDirectInvolvementSelection } from "@/modules/lavoratori/lib"
import { indexRowsByStringId, uniqueNonEmptyStrings } from "@/lib/value-utils"

import type { RelatedActiveSearchItem, RelatedSearchGroups } from "../types"
import {
  fetchRelatedFamiliesByIds,
  fetchRelatedProcessesByIds,
} from "./worker-pipeline-view-data"
import {
  formatRelatedFamilyName,
  formatRelatedSearchLabel,
  formatRelatedZona,
} from "./worker-pipeline-view-utils"

export function resolveRecruiterLabel(
  recruiterId: string | null | undefined,
  recruiterLabelsById: Map<string, string>,
) {
  if (!recruiterId) return "Recruiter non assegnato"
  return recruiterLabelsById.get(recruiterId) ?? "Recruiter non assegnato"
}

export function buildRelatedActiveSearchItem(
  selection: Record<string, unknown>,
  processRow: Record<string, unknown>,
  familyRow: Record<string, unknown> | null | undefined,
  recruiterLabelsById: Map<string, string>,
): RelatedActiveSearchItem {
  return {
    selectionId: asString(selection.id) ?? "",
    processId: asString(selection.processo_matching_id) ?? "",
    familyName: formatRelatedFamilyName(familyRow),
    ricercaLabel: formatRelatedSearchLabel(processRow),
    recruiterLabel: resolveRecruiterLabel(
      asString(processRow.recruiter_ricerca_e_selezione_id),
      recruiterLabelsById,
    ),
    statoSelezione: asString(selection.stato_selezione) || "-",
    statoRicerca: asString(processRow.stato_res) || "-",
    orarioDiLavoro: asString(processRow.orario_di_lavoro) || "-",
    zona: formatRelatedZona(processRow),
    appunti: asString(selection.note_selezione) || "",
  }
}

export async function fetchRelatedSearchLookupMaps(processIds: string[]) {
  const processRows = await fetchRelatedProcessesByIds(processIds)
  const processRowsById = indexRowsByStringId(processRows)
  const familyIds = uniqueNonEmptyStrings(
    processRows.map((row) => asString(row.famiglia_id)),
  )
  const familyRows = await fetchRelatedFamiliesByIds(familyIds)

  return {
    processRowsById,
    familyRowsById: indexRowsByStringId(familyRows),
  }
}

type BuildRelatedSearchGroupsParams = {
  selections: Record<string, unknown>[]
  processRowsById: Map<string, Record<string, unknown>>
  familyRowsById: Map<string, Record<string, unknown>>
  recruiterLabelsById: Map<string, string>
  currentProcessId: string
  currentSelectionId?: string | null
  directInvolvementOnly?: boolean
}

export function buildRelatedSearchGroups({
  selections,
  processRowsById,
  familyRowsById,
  recruiterLabelsById,
  currentProcessId,
  currentSelectionId = null,
  directInvolvementOnly = false,
}: BuildRelatedSearchGroupsParams): RelatedSearchGroups {
  const seenProcessIds = new Set<string>()
  const direct: RelatedActiveSearchItem[] = []
  const other: RelatedActiveSearchItem[] = []

  for (const selection of selections) {
    const selectionId = asString(selection.id)
    const selectionProcessId = asString(selection.processo_matching_id)
    if (!selectionId || !selectionProcessId) continue
    if (selectionProcessId === currentProcessId) continue
    if (currentSelectionId && selectionId === currentSelectionId) continue
    if (seenProcessIds.has(selectionProcessId)) continue

    const processRow = processRowsById.get(selectionProcessId)
    if (!processRow) continue

    const isDirect = isDirectInvolvementSelection(selection)
    if (directInvolvementOnly && !isDirect) continue

    const familyRow = familyRowsById.get(asString(processRow.famiglia_id) ?? "")
    const item = buildRelatedActiveSearchItem(
      selection,
      processRow,
      familyRow,
      recruiterLabelsById,
    )

    if (isDirect) {
      direct.push(item)
    } else if (!directInvolvementOnly) {
      other.push(item)
    }
    seenProcessIds.add(selectionProcessId)
  }

  return { direct, other }
}

export function toWorkerOtherSelectionSummaryItems(
  items: RelatedActiveSearchItem[],
): WorkerOtherSelectionSummaryItem[] {
  return items.map((item) => ({
    id: item.processId,
    familyName: item.familyName,
    ricercaLabel: item.ricercaLabel,
    recruiterLabel: item.recruiterLabel,
    statoSelezione: item.statoSelezione,
    statoRicerca: item.statoRicerca,
    orarioDiLavoro: item.orarioDiLavoro,
    zona: item.zona,
    appunti: item.appunti,
  }))
}
