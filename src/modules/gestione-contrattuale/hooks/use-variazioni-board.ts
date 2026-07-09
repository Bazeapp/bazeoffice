import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { useCreateMutation, useMoveMutation } from "@/hooks/use-board-mutations"

import {
  applyOptimisticCardMove,
  updateCardInColumns,
} from "@/lib/board-column-utils"
import { buildStageMetadataFromDefaults } from "@/lib/lookup-stage-metadata"
import { fetchLookupValues } from "@/lib/lookup-values"
import { normalizeComparableToken, toStringValue } from "@/lib/value-utils"
import { createRecord, updateRecord } from "@/lib/record-crud"
import { mapVariazioneBoardCard } from "../lib/variazioni-board"
import { fetchAssunzioniNamesByRapportoIds } from "../queries/fetch-assunzioni-names-by-rapporto-ids"
import { fetchVariazioniBoard } from "../queries/fetch-variazioni-board"
import type {
  VariazioniBoardCardData,
  VariazioniBoardColumnData,
  VariazioniRapportoOption,
} from "../types"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import { getRapportoTitle } from "@/modules/rapporti/lib"
import type { VariazioneContrattualeRecord } from "@/types"

const VARIAZIONI_BOARD_QUERY_KEY = ["variazioni-board"] as const

type BoardData = {
  columns: VariazioniBoardColumnData[]
  rapportoOptions: VariazioniRapportoOption[]
}

const VARIAZIONI_REALTIME_TABLES = [
  "variazioni_contrattuali",
  "rapporti_lavorativi",
  "famiglie",
  "lavoratori",
  "indirizzi",
]

type VariazioneStageDefinition = {
  id: string
  label: string
  color: string
}

type UseVariazioniBoardState = {
  loading: boolean
  error: string | null
  columns: VariazioniBoardColumnData[]
  rapportoOptions: VariazioniRapportoOption[]
  createVariazione: (input: {
    rapportoId: string
    variazioneDaApplicare: string
    dataVariazione: string
  }) => Promise<void>
  moveCard: (recordId: string, targetStageId: string) => Promise<void>
  updateCard: (
    recordId: string,
    updater: (card: VariazioniBoardCardData) => VariazioniBoardCardData
  ) => void
}

type GenericRow = Record<string, unknown>

const DEFAULT_STAGE_DEFINITIONS: VariazioneStageDefinition[] = [
  { id: "presa in carico", label: "presa in carico", color: "sky" },
  { id: "variazione effettuata", label: "variazione effettuata", color: "cyan" },
  { id: "documenti inviati", label: "documenti inviati", color: "teal" },
]

function toPersonName(row: GenericRow | null) {
  if (!row) return null
  return { cognome: toStringValue(row.cognome), nome: toStringValue(row.nome) }
}

async function fetchVariazioniBoardData(
  /**
   * Read latest cached card at mapping time (after the network fetch) so any
   * concurrent `setQueryData` (e.g. from `loadSelectedCard` in the view
   * completing mid-fetch) is observed and we never reinstate a stale
   * snapshot. Reading a snapshot at queryFn start would race against detail
   * refetches.
   */
  getPreviousCard?: (cardId: string) => VariazioniBoardCardData | undefined,
): Promise<{
  columns: VariazioniBoardColumnData[]
  rapportoOptions: VariazioniRapportoOption[]
}> {
  const [boardResult, lookupResult] = await Promise.all([
    fetchVariazioniBoard(),
    fetchLookupValues(),
  ])

  // Nomi dalle assunzioni collegate (priorità sul nome del rapporto) per card
  // e opzioni della modale.
  const rapportoIds = [
    ...boardResult.cards.map((row) => row.rapporto?.id),
    ...boardResult.rapporti.map((row) => row.rapporto.id),
  ].filter((id): id is string => Boolean(id))
  const assunzioneNamesByRapporto = await fetchAssunzioniNamesByRapportoIds(rapportoIds)

  const stageMetadata = buildStageMetadataFromDefaults({
    defaultStages: DEFAULT_STAGE_DEFINITIONS,
    lookupRows: lookupResult.rows,
    entityTable: "variazioni_contrattuali",
    entityField: "stato",
  })
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, VariazioniBoardCardData[]>(
    stages.map((stage) => [stage.id, []])
  )

  for (const row of boardResult.cards) {
    const record = row.record
    const stage = aliases.get(normalizeComparableToken(record.stato))
    if (!stage) continue

    const previousCard = getPreviousCard?.(record.id)
    const assunzioneNames = row.rapporto?.id
      ? assunzioneNamesByRapporto[row.rapporto.id] ?? null
      : null
    const card = mapVariazioneBoardCard(row, stage, previousCard, assunzioneNames)
    cardsByStage.get(stage)?.push(card)
  }

  const columns = stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: cardsByStage.get(stage.id) ?? [],
  }))

  const rapportoOptions = boardResult.rapporti
    .map((row) => {
      const assunzioneNames = assunzioneNamesByRapporto[row.rapporto.id] ?? null
      return {
        id: row.rapporto.id,
        label: getRapportoTitle(row.rapporto, {
          famiglia: toPersonName((row.famiglia as GenericRow | null) ?? null),
          lavoratore: toPersonName((row.lavoratore as GenericRow | null) ?? null),
          assunzioneDatore: assunzioneNames?.datore,
          assunzioneLavoratore: assunzioneNames?.lavoratore,
        }),
        rapporto: row.rapporto,
      }
    })
    .sort((left, right) => left.label.localeCompare(right.label, "it"))

  return { columns, rapportoOptions }
}

export function useVariazioniBoard(): UseVariazioniBoardState {
  const queryClient = useQueryClient()

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: VARIAZIONI_BOARD_QUERY_KEY,
    queryFn: () =>
      fetchVariazioniBoardData((cardId) => {
        // Read latest cached card at mapping time (Pattern A — see
        // docs/realtime-board-pattern.md) so any concurrent setQueryData
        // from the view-level detail loader is observed and we never
        // reinstate a stale snapshot.
        const latest = queryClient.getQueryData<BoardData>(
          VARIAZIONI_BOARD_QUERY_KEY,
        )
        if (!latest) return undefined
        for (const column of latest.columns) {
          const card = column.cards.find((c) => c.id === cardId)
          if (card) return card
        }
        return undefined
      }),
  })

  const columns = data?.columns ?? []
  const rapportoOptions = data?.rapportoOptions ?? []

  const { setBoardData, invalidateBoard } = useBoardQueryCache<BoardData>(
    VARIAZIONI_BOARD_QUERY_KEY,
  )

  const updateCard = React.useCallback(
    (
      recordId: string,
      updater: (card: VariazioniBoardCardData) => VariazioniBoardCardData
    ) => {
      setBoardData((previous) => {
        if (!previous) return previous
        return {
          ...previous,
          columns: updateCardInColumns(previous.columns, recordId, updater),
        }
      })
    },
    [setBoardData],
  )

  const moveMutation = useMoveMutation<
    { recordId: string; targetStageId: string },
    unknown,
    BoardData
  >({
    queryKey: VARIAZIONI_BOARD_QUERY_KEY,
    mutationFn: ({ recordId, targetStageId }) =>
      updateRecord("variazioni_contrattuali", recordId, { stato: targetStageId }),
    applyOptimistic: (previous, { recordId, targetStageId }) => {
      if (!previous) return previous
      const nextColumns = applyOptimisticCardMove(previous.columns, recordId, targetStageId)
      return nextColumns ? { ...previous, columns: nextColumns } : previous
    },
  })

  const moveCard = React.useCallback(
    async (recordId: string, targetStageId: string) => {
      await moveMutation.mutateAsync({ recordId, targetStageId })
    },
    [moveMutation],
  )

  const createMutation = useCreateMutation<
    { rapportoId: string; variazioneDaApplicare: string; dataVariazione: string },
    { record: VariazioneContrattualeRecord; initialStage: string },
    BoardData
  >({
    queryKey: VARIAZIONI_BOARD_QUERY_KEY,
    mutationFn: async (input) => {
      const initialStage = DEFAULT_STAGE_DEFINITIONS[0].id
      const response = await createRecord("variazioni_contrattuali", {
        rapporto_lavorativo_id: input.rapportoId,
        variazione_da_applicare: input.variazioneDaApplicare,
        data_variazione: input.dataVariazione || null,
        stato: initialStage,
      })
      return { record: response.row as VariazioneContrattualeRecord, initialStage }
    },
  })

  const createVariazione = React.useCallback(
    async (input: {
      rapportoId: string
      variazioneDaApplicare: string
      dataVariazione: string
    }) => {
      await createMutation.mutateAsync(input)
    },
    [createMutation],
  )

  useRealtimeBoardSync({
    tables: VARIAZIONI_REALTIME_TABLES,
    reload: invalidateBoard,
  })

  const error =
    moveMutation.error instanceof Error
      ? moveMutation.error.message
      : createMutation.error instanceof Error
        ? createMutation.error.message
        : queryError instanceof Error
          ? queryError.message
          : null

  return {
    loading: isLoading,
    error,
    columns,
    rapportoOptions,
    createVariazione,
    moveCard,
    updateCard,
  }
}
