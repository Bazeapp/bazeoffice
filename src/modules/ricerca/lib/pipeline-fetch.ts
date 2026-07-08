import { fetchIndirizziByEntity } from "@/lib/indirizzi-api"
import { fetchLookupValues } from "@/lib/lookup-values"
import {
  getDefaultWorkerAvatar,
  normalizeLookupColors,
} from "@/modules/lavoratori/lib"
import { fetchLavoratoriByIds } from "@/modules/lavoratori/queries"

import { fetchSelezioniLookup } from "../queries/fetch-selezioni-lookup"
import type {
  RicercaWorkerSelectionCard,
  RicercaWorkerSelectionColumn,
} from "../types"
import type { GenericRow } from "../types/workers-pipeline"
import { ADDRESS_BATCH_SIZE, WORKER_BATCH_SIZE } from "./pipeline-constants"
import { mergeGroupedPipelineColumns } from "./pipeline-column-utils"
import { canonicalizeSelectionStatus } from "./pipeline-status-utils"
import { buildStageMetadata } from "./pipeline-stage-metadata"
import {
  buildWorkerListItem,
  fetchRelatedSelectionSummariesByWorkerIds,
} from "./pipeline-worker-mapper"
import { asRowArray, normalizeLookupToken, toNumberValue, toStringValue } from "./pipeline-value-utils"

export async function fetchAllSelectionsForProcess(processId: string) {
  const rows: GenericRow[] = []

  const result = await fetchSelezioniLookup({ processoIds: [processId] }).catch(
    (error) => {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`selezioni_lookup: ${message}`)
    },
  )
  rows.push(...asRowArray(result.rows))

  return rows
}

export async function fetchWorkersByIds(workerIds: string[]) {
  if (workerIds.length === 0) return []

  const workerRows: GenericRow[] = []

  for (let index = 0; index < workerIds.length; index += WORKER_BATCH_SIZE) {
    const batch = workerIds.slice(index, index + WORKER_BATCH_SIZE)
    const result = await fetchLavoratoriByIds(batch).catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`lavoratori_by_ids(batch ${index}): ${message}`)
    })

    workerRows.push(...asRowArray(result.rows))
  }

  return workerRows
}

export async function fetchWorkerAddressesByIds(workerIds: string[]) {
  if (workerIds.length === 0) return new Map<string, GenericRow[]>()

  const addressesByWorkerId = new Map<string, GenericRow[]>()

  for (let index = 0; index < workerIds.length; index += ADDRESS_BATCH_SIZE) {
    const batch = workerIds.slice(index, index + ADDRESS_BATCH_SIZE)
    const result = await fetchIndirizziByEntity("lavoratori", batch).catch(
      (error) => {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`indirizzi_by_entity(batch ${index}): ${message}`)
      },
    )

    for (const row of asRowArray(result.rows)) {
      const workerId = toStringValue(row.entita_id)
      if (!workerId) continue
      const current = addressesByWorkerId.get(workerId) ?? []
      current.push(row)
      addressesByWorkerId.set(workerId, current)
    }
  }

  return addressesByWorkerId
}

export async function fetchWorkersPipelineData(
  processId: string,
): Promise<RicercaWorkerSelectionColumn[]> {
  const [selezioniRows, lookupResult] = await Promise.all([
    fetchAllSelectionsForProcess(processId),
    fetchLookupValues().catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`lookup_values: ${message}`)
    }),
  ])

  const lookupRows = lookupResult.rows
  const lookupColorsByDomain = normalizeLookupColors(lookupRows)

  const workerIds = Array.from(
    new Set(
      selezioniRows
        .map((selection) => toStringValue(selection.lavoratore_id))
        .filter((value): value is string => Boolean(value)),
    ),
  )

  const [workerRows, addressesByWorkerId, relatedSelectionsByWorkerId] =
    await Promise.all([
      fetchWorkersByIds(workerIds),
      fetchWorkerAddressesByIds(workerIds),
      fetchRelatedSelectionSummariesByWorkerIds({
        workerIds,
        currentProcessId: processId,
        lookupColorsByDomain,
      }),
    ])
  const stageMetadata = buildStageMetadata(lookupRows)
  const stageDefinitions = stageMetadata.definitions

  const workerById = new Map<string, GenericRow>()
  for (const worker of workerRows) {
    const workerId = toStringValue(worker.id)
    if (!workerId) continue
    workerById.set(workerId, worker)
  }

  const cardsByStageId = new Map<string, RicercaWorkerSelectionCard[]>()
  for (const stage of stageDefinitions) {
    cardsByStageId.set(stage.id, [])
  }

  const unknownStages = new Map<string, RicercaWorkerSelectionColumn>()

  for (const selection of selezioniRows) {
    const id = toStringValue(selection.id)
    const statusRaw = toStringValue(selection.stato_selezione) ?? "Prospetto"
    const workerId = toStringValue(selection.lavoratore_id)
    if (!id || !workerId) continue

    const stage =
      stageMetadata.aliases.get(normalizeLookupToken(statusRaw)) ?? statusRaw
    const canonicalStage = canonicalizeSelectionStatus(stage)
    const worker = workerById.get(workerId)

    const workerCard = worker
      ? {
          ...buildWorkerListItem(worker, lookupColorsByDomain, addressesByWorkerId),
          travelTimeMinutes: toNumberValue(selection.travel_time_tra_cap),
          otherActiveSelections: relatedSelectionsByWorkerId.get(workerId) ?? null,
        }
      : {
          id: workerId,
          nomeCompleto: workerId,
          immagineUrl: getDefaultWorkerAvatar(workerId),
          travelTimeMinutes: toNumberValue(selection.travel_time_tra_cap),
          locationLabel: null,
          telefono: null,
          isBlacklisted: false,
          tipoRuolo: null,
          tipoRuoloColor: null,
          tipoLavori: [],
          tipoLavoriColors: {},
          tipoLavoro: null,
          tipoLavoroColor: null,
          ruoliDomestici: [],
          eta: null,
          anniEsperienzaColf: null,
          anniEsperienzaBabysitter: null,
          statoLavoratore: "-",
          statoLavoratoreColor: null,
          disponibilita: null,
          disponibilitaColor: null,
          coordinates: null,
          isDisponibile: null,
          isQualified: false,
          isIdoneo: false,
          isCertificato: false,
          otherActiveSelections: relatedSelectionsByWorkerId.get(workerId) ?? null,
        }

    const card: RicercaWorkerSelectionCard = {
      id,
      status: canonicalStage,
      punteggio: toStringValue(selection.punteggio) ?? "-",
      scheduledAt: toStringValue(selection.data_ora_colloquio_famiglia_lavoratore),
      endedAt: toStringValue(selection.data_ora_fine_colloquio_famiglia_lavoratore),
      worker: workerCard,
    }

    const knownColumn = cardsByStageId.get(canonicalStage)
    if (knownColumn) {
      knownColumn.push(card)
      continue
    }

    if (!unknownStages.has(canonicalStage)) {
      unknownStages.set(canonicalStage, {
        id: canonicalStage,
        label: canonicalStage,
        color: null,
        cards: [],
      })
    }
    unknownStages.get(canonicalStage)?.cards.push(card)
  }

  const baseColumns: RicercaWorkerSelectionColumn[] = [
    ...stageDefinitions.map((stage) => ({
      id: stage.id,
      label: stage.label,
      color: stage.color,
      cards: cardsByStageId.get(stage.id) ?? [],
    })),
    ...unknownStages.values(),
  ]

  return mergeGroupedPipelineColumns(baseColumns)
}
