import { fetchIndirizziByEntity } from "@/lib/indirizzi-api"
import { fetchLookupValues } from "@/lib/lookup-values"
import type { RichiestaAttivazioneRecord } from "@/types"
import { fetchCrmPipelineFamiglieBoard } from "../queries/fetch-crm-pipeline-famiglie-board"
import type { CrmPipelineCardData, CrmPipelineFilters, GenericRow } from "../types"
import type {
  BoardRecordBundle,
  CrmPipelineStageDefinition,
  FetchBoardDataResult,
} from "../types/crm-pipeline-preview"
import {
  ADDRESS_BATCH_SIZE,
  CLOSED_STAGE_IDS,
  CRM_PIPELINE_CARD_LIMIT,
  CRM_PIPELINE_SEARCH_CARD_LIMIT,
} from "./constants"
import { mapBoardEntryToCard } from "./card-mapper"
import {
  buildLookupColorMap,
  buildLookupOptionsByField,
  buildStageDefinitions,
  getProcessAddressTypePriority,
  sortCardsForStage,
} from "./lookup-utils"
import { asRowArray, normalizeLookupToken, toStringValue } from "./value-utils"

export async function fetchProcessAddressesByIds(processIds: string[]) {
  const uniqueProcessIds = Array.from(new Set(processIds.filter(Boolean)))
  const addressesByProcessId = new Map<string, GenericRow>()
  if (uniqueProcessIds.length === 0) return addressesByProcessId

  const chunks = []
  for (let index = 0; index < uniqueProcessIds.length; index += ADDRESS_BATCH_SIZE) {
    chunks.push({
      index,
      batch: uniqueProcessIds.slice(index, index + ADDRESS_BATCH_SIZE),
    })
  }

  const results = await Promise.all(
    chunks.map(({ batch }) =>
      fetchIndirizziByEntity("processi_matching", batch),
    )
  )

  for (const result of results) {
    for (const row of asRowArray(result.rows)) {
      const processId = toStringValue(row.entita_id)
      if (!processId) continue
      const current = addressesByProcessId.get(processId)
      const currentPriority = current
        ? getProcessAddressTypePriority(current.tipo_indirizzo)
        : null
      const nextPriority = getProcessAddressTypePriority(row.tipo_indirizzo)
      if (nextPriority === null) continue
      if (currentPriority === null || nextPriority < currentPriority) {
        addressesByProcessId.set(processId, row)
      }
    }
  }

  return addressesByProcessId
}

function buildSalesStageCounts(
  groups: Array<{ value: string; count: number }>,
  tokenToStageId: Map<string, string>
) {
  const counts = new Map<string, number>()

  for (const group of groups) {
    const token = normalizeLookupToken(group.value)
    const stageId = tokenToStageId.get(token) ?? token
    if (!stageId) continue
    counts.set(stageId, (counts.get(stageId) ?? 0) + group.count)
  }

  return counts
}

function getStageFilterValues(stages: CrmPipelineStageDefinition[], loadedClosedStageIds: Set<string>) {
  const values: string[] = []

  for (const stage of stages) {
    if (
      CLOSED_STAGE_IDS.has(stage.id) &&
      !loadedClosedStageIds.has(stage.id)
    ) {
      continue
    }

    values.push(stage.id, stage.label)
  }

  return Array.from(new Set(values.filter(Boolean)))
}

function hasActiveServerFilters(searchQuery: string, filters: CrmPipelineFilters) {
  return (
    Boolean(searchQuery.trim()) ||
    Boolean(filters.createdFrom) ||
    Boolean(filters.createdTo) ||
    Boolean(filters.tipoLavoro?.length) ||
    filters.preventivoAccettato !== null ||
    filters.chiamataPrenotata !== null
  )
}

async function fetchBoardRecordsWithRpc(
  stageFilter: string[],
  searchQuery: string,
  filters: CrmPipelineFilters
): Promise<BoardRecordBundle> {
  const result = await fetchCrmPipelineFamiglieBoard({
    limit: searchQuery.trim() ? CRM_PIPELINE_SEARCH_CARD_LIMIT : CRM_PIPELINE_CARD_LIMIT,
    offset: 0,
    stageFilter,
    search: searchQuery,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    tipoLavoro: filters.tipoLavoro,
    preventivoAccettato: filters.preventivoAccettato,
    chiamataPrenotata: filters.chiamataPrenotata,
  })

  return {
    entries: result.rows
      .map((row) => ({
        process: row.process,
        family: row.family,
        address: row.address,
        richiestaAttivazione: (row.richiesta_attivazione ?? null) as RichiestaAttivazioneRecord | null,
      }))
      .filter((entry) => Boolean(entry.process)),
    stageGroups: result.stageCounts,
  }
}

async function fetchBoardRecordsForStages(
  stageFilter: string[],
  searchQuery: string,
  filters: CrmPipelineFilters
): Promise<BoardRecordBundle> {
  // FASE 4 BIS: rimosso il fallback table-query (fetchBoardRecordsWithTableQueries).
  // La board RPC crm_pipeline_famiglie_board è la sola fonte; gli errori
  // propagano e diventano visibili via toast invece di mascherarsi.
  return fetchBoardRecordsWithRpc(stageFilter, searchQuery, filters)
}

export async function fetchBoardData(
  loadedClosedStageIds: Set<string>,
  searchQuery: string,
  filters: CrmPipelineFilters,
  /**
   * Called lazily at mapping time (AFTER the network fetch) so any concurrent
   * `setBoardData` (e.g. from a parallel `loadProcessDetail`) is observed
   * when we merge previous detail-only fields. Reading a snapshot at queryFn
   * start would race against detail refetches and reinstate stale values.
   */
  getPreviousCard?: (processId: string) => CrmPipelineCardData | undefined,
): Promise<FetchBoardDataResult> {
  const normalizedSearchQuery = searchQuery.trim()
  const lookupResult = await fetchLookupValues()
  const lookupRows = lookupResult.rows
  const lookupColors = buildLookupColorMap(lookupRows)
  const lookupOptionsByField = buildLookupOptionsByField(lookupRows)
  const { stages, tokenToStageId } = buildStageDefinitions(lookupRows)
  const effectiveLoadedClosedStageIds = hasActiveServerFilters(
    normalizedSearchQuery,
    filters
  )
    ? new Set([...loadedClosedStageIds, ...CLOSED_STAGE_IDS])
    : loadedClosedStageIds
  const boardRecords = await fetchBoardRecordsForStages(
    getStageFilterValues(stages, effectiveLoadedClosedStageIds),
    normalizedSearchQuery,
    filters
  )
  const salesStageCounts = buildSalesStageCounts(
    boardRecords.stageGroups,
    tokenToStageId
  )
  if (stages.length === 0) {
    return {
      columns: [],
      lookupOptionsByField,
    }
  }

  const cardsByStage = new Map<string, CrmPipelineCardData[]>()
  for (const stage of stages) {
    cardsByStage.set(stage.id, [])
  }

  for (const { process, family, address, richiestaAttivazione } of boardRecords.entries) {
    if (!family) continue

    const statusToken = normalizeLookupToken(toStringValue(process.stato_sales))
    const stageId = tokenToStageId.get(statusToken)
    if (!stageId) continue

    const processId = toStringValue(process.id)
    const previousCard = processId ? getPreviousCard?.(processId) : undefined
    const card = mapBoardEntryToCard(
      { process, family, address, richiestaAttivazione },
      stageId,
      lookupColors,
      previousCard,
    )
    if (!card) continue
    cardsByStage.get(stageId)?.push(card)
  }

  return {
    columns: stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      color: stage.color,
      totalCount: salesStageCounts.get(stage.id) ?? cardsByStage.get(stage.id)?.length ?? 0,
      cards: sortCardsForStage(cardsByStage.get(stage.id) ?? [], stage.id),
    })),
    lookupOptionsByField,
  }
}

export function serializeCrmPipelineFilters(filters: CrmPipelineFilters) {
  return JSON.stringify({
    createdFrom: filters.createdFrom ?? null,
    createdTo: filters.createdTo ?? null,
    tipoLavoro: [...(filters.tipoLavoro ?? [])].sort(),
    preventivoAccettato: filters.preventivoAccettato ?? null,
    chiamataPrenotata: filters.chiamataPrenotata ?? null,
  })
}
