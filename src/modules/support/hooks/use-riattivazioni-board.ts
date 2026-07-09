import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { useMoveMutation } from "@/hooks/use-board-mutations"

import {
  applyOptimisticCardMove,
  updateCardInColumns,
} from "@/lib/board-column-utils"
import { updateRecord } from "@/lib/record-crud"
import { formatItalianDate } from "@/lib/value-utils"
import { fetchAssunzioniNamesByRapportoIds } from "@/modules/gestione-contrattuale/queries"
import { fetchRiattivazioniBoard } from "../queries/fetch-riattivazioni-board"
import {
  getChiusuraTipoLabel,
  hasRiattivazioneStatus,
  resolveStage,
  RIATTIVAZIONI_STAGE_DEFINITIONS,
  shouldShowUnclassifiedChiusura,
} from "../lib/riattivazioni-stage"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import { getRapportoFamilyLabel, getRapportoWorkerLabel } from "@/modules/rapporti/lib"
import type {
  ChiusuraContrattoRecord,
  FamigliaRecord,
  LavoratoreRecord,
  RapportoLavorativoRecord,
} from "@/types"

const RIATTIVAZIONI_REALTIME_TABLES = [
  "chiusure_contratti",
  "rapporti_lavorativi",
  "famiglie",
  "lavoratori",
]

import type {
  RiattivazioneStageId,
  RiattivazioniBoardCardData,
  RiattivazioniBoardColumnData,
} from "../types"
const RIATTIVAZIONI_BOARD_QUERY_KEY = ["riattivazioni-board"] as const

type UseRiattivazioniBoardState = {
  loading: boolean
  error: string | null
  columns: RiattivazioniBoardColumnData[]
  moveCard: (recordId: string, targetStageId: RiattivazioneStageId) => Promise<void>
  updateCard: (
    recordId: string,
    updater: (card: RiattivazioniBoardCardData) => RiattivazioniBoardCardData,
  ) => void
}

type RiattivazioneFamigliaLookup = Pick<FamigliaRecord, "id" | "nome" | "cognome" | "email">

type RiattivazioneLavoratoreLookup = Pick<LavoratoreRecord, "id" | "nome" | "cognome" | "email">

type RiattivazioneBaseCard = {
  record: ChiusuraContrattoRecord
  rapporto: RapportoLavorativoRecord | null
  stage: RiattivazioneStageId
}

type BoardData = { columns: RiattivazioniBoardColumnData[] }

function getFallbackFamigliaLabel(record: ChiusuraContrattoRecord) {
  return [record.cognome, record.nome].filter(Boolean).join(" ").trim() || "Famiglia senza nome"
}

async function fetchRiattivazioniBoardData(): Promise<BoardData> {
  const boardResult = await fetchRiattivazioniBoard()

  const baseCards: RiattivazioneBaseCard[] = []
  const famigliaById = new Map<string, RiattivazioneFamigliaLookup>()
  const lavoratoreById = new Map<string, RiattivazioneLavoratoreLookup>()
  for (const row of boardResult.cards) {
    const record = row.record as ChiusuraContrattoRecord
    const rapporto = (row.rapporto as RapportoLavorativoRecord | null) ?? null
    const stage = resolveStage(record.stato_riattivazione_famiglia)
    const hasExplicitStage = hasRiattivazioneStatus(record.stato_riattivazione_famiglia)
    if (!hasExplicitStage && !shouldShowUnclassifiedChiusura(rapporto)) continue
    baseCards.push({ record, rapporto, stage })
    if (row.famiglia) famigliaById.set(row.famiglia.id, row.famiglia as RiattivazioneFamigliaLookup)
    if (row.lavoratore) lavoratoreById.set(row.lavoratore.id, row.lavoratore as RiattivazioneLavoratoreLookup)
  }

  // Nomi dalle assunzioni collegate (priorità sul nome del rapporto).
  const assunzioneNamesByRapporto = await fetchAssunzioniNamesByRapportoIds(
    baseCards
      .map(({ rapporto }) => rapporto?.id)
      .filter((id): id is string => Boolean(id))
  )

  const cardsByStage = new Map<RiattivazioneStageId, RiattivazioniBoardCardData[]>(
    RIATTIVAZIONI_STAGE_DEFINITIONS.map((stage) => [stage.id, []]),
  )

  for (const { record, rapporto, stage } of baseCards) {
    const famiglia = rapporto?.famiglia_id ? famigliaById.get(rapporto.famiglia_id) ?? null : null
    const lavoratore = rapporto?.lavoratore_id
      ? lavoratoreById.get(rapporto.lavoratore_id) ?? null
      : null
    const assunzioneNames = rapporto ? assunzioneNamesByRapporto[rapporto.id] ?? null : null
    const famigliaLabel = rapporto
      ? getRapportoFamilyLabel(rapporto, famiglia as FamigliaRecord | null, assunzioneNames?.datore)
      : getFallbackFamigliaLabel(record)
    const lavoratoreLabel = rapporto
      ? getRapportoWorkerLabel(rapporto, lavoratore as LavoratoreRecord | null, assunzioneNames?.lavoratore)
      : "Lavoratore non associato"
    const nomeCompleto = rapporto ? `${famigliaLabel} – ${lavoratoreLabel}` : famigliaLabel

    const card: RiattivazioniBoardCardData = {
      id: record.id,
      stage,
      record,
      rapporto,
      nomeCompleto,
      famigliaLabel,
      lavoratoreLabel,
      email: record.email ?? famiglia?.email ?? "-",
      motivazione: record.motivazione_lost,
      dataFineRapporto: formatItalianDate(record.data_fine_rapporto),
      tipoLabel: getChiusuraTipoLabel(record),
    }

    cardsByStage.get(stage)?.push(card)
  }

  const columns = RIATTIVAZIONI_STAGE_DEFINITIONS.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: cardsByStage.get(stage.id) ?? [],
  }))

  return { columns }
}

export function useRiattivazioniBoard(): UseRiattivazioniBoardState {
  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: RIATTIVAZIONI_BOARD_QUERY_KEY,
    queryFn: fetchRiattivazioniBoardData,
  })

  const columns = data?.columns ?? []

  const { setBoardData, invalidateBoard } = useBoardQueryCache<BoardData>(
    RIATTIVAZIONI_BOARD_QUERY_KEY,
  )

  const updateCard = React.useCallback(
    (
      recordId: string,
      updater: (card: RiattivazioniBoardCardData) => RiattivazioniBoardCardData,
    ) => {
      setBoardData((previous) => {
        if (!previous) return previous
        return {
          columns: updateCardInColumns(previous.columns, recordId, updater) as RiattivazioniBoardColumnData[],
        }
      })
    },
    [setBoardData],
  )

  const moveMutation = useMoveMutation<
    { recordId: string; targetStageId: RiattivazioneStageId },
    unknown,
    BoardData
  >({
    queryKey: RIATTIVAZIONI_BOARD_QUERY_KEY,
    mutationFn: ({ recordId, targetStageId }) =>
      updateRecord("chiusure_contratti", recordId, {
        stato_riattivazione_famiglia: targetStageId,
      }),
    applyOptimistic: (previous, { recordId, targetStageId }) => {
      if (!previous) return previous
      const nextColumns = applyOptimisticCardMove<
        RiattivazioniBoardColumnData,
        RiattivazioniBoardCardData
      >(
        previous.columns,
        recordId,
        targetStageId,
        (card, stage) => ({
          ...card,
          stage: stage as RiattivazioneStageId,
          record: {
            ...card.record,
            stato_riattivazione_famiglia: stage as RiattivazioneStageId,
          },
        }),
      )
      if (!nextColumns) return previous
      return { columns: nextColumns }
    },
  })

  const moveCard = React.useCallback(
    async (recordId: string, targetStageId: RiattivazioneStageId) => {
      await moveMutation.mutateAsync({ recordId, targetStageId })
    },
    [moveMutation],
  )

  useRealtimeBoardSync({
    tables: RIATTIVAZIONI_REALTIME_TABLES,
    reload: invalidateBoard,
  })

  const error =
    moveMutation.error instanceof Error
      ? moveMutation.error.message
      : queryError instanceof Error
        ? queryError.message
        : null

  return {
    loading: isLoading,
    error,
    columns,
    moveCard,
    updateCard,
  }
}
