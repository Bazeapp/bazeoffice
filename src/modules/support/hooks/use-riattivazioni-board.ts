import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useMoveMutation } from "@/hooks/use-board-mutations"

import { updateRecord } from "@/lib/record-crud"
import { fetchAssunzioniNamesByRapportoIds } from "@/modules/gestione-contrattuale"
import { fetchRiattivazioniBoard } from "../queries/fetch-riattivazioni-board"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import {
  getRapportoFamilyLabel,
  getRapportoWorkerLabel,
} from "@/modules/rapporti/features/rapporti/rapporti-labels"
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

const RIATTIVAZIONI_BOARD_QUERY_KEY = ["riattivazioni-board"] as const

export type RiattivazioneStageId =
  | "da sentire"
  | "in attesa"
  | "riattivato"
  | "non riattiva"

type RiattivazioneStageDefinition = {
  id: RiattivazioneStageId
  label: string
  color: string
}

export type RiattivazioniBoardCardData = {
  id: string
  stage: RiattivazioneStageId
  record: ChiusuraContrattoRecord
  rapporto: RapportoLavorativoRecord | null
  nomeCompleto: string
  famigliaLabel: string
  lavoratoreLabel: string
  email: string
  motivazione: string | null
  dataFineRapporto: string
  tipoLabel: string
}

export type RiattivazioniBoardColumnData = {
  id: RiattivazioneStageId
  label: string
  color: string
  cards: RiattivazioniBoardCardData[]
}

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

export const RIATTIVAZIONI_STAGE_DEFINITIONS: RiattivazioneStageDefinition[] = [
  { id: "da sentire", label: "Da sentire", color: "sky" },
  { id: "in attesa", label: "In attesa", color: "amber" },
  { id: "riattivato", label: "Riattivato", color: "emerald" },
  { id: "non riattiva", label: "Non riattiva", color: "rose" },
]

const DEFAULT_STAGE_ID: RiattivazioneStageId = "da sentire"

type RiattivazioneFamigliaLookup = Pick<FamigliaRecord, "id" | "nome" | "cognome" | "email">

type RiattivazioneLavoratoreLookup = Pick<LavoratoreRecord, "id" | "nome" | "cognome" | "email">

type RiattivazioneBaseCard = {
  record: ChiusuraContrattoRecord
  rapporto: RapportoLavorativoRecord | null
  stage: RiattivazioneStageId
}

type BoardData = { columns: RiattivazioniBoardColumnData[] }

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

function formatItalianDate(value: unknown) {
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

export function resolveStage(value: string | null | undefined): RiattivazioneStageId {
  const normalized = normalizeToken(value)
  const matchedStage = RIATTIVAZIONI_STAGE_DEFINITIONS.find(
    (stage) => normalizeToken(stage.id) === normalized || normalizeToken(stage.label) === normalized,
  )
  return matchedStage?.id ?? DEFAULT_STAGE_ID
}

export function hasRiattivazioneStatus(value: string | null | undefined) {
  return normalizeToken(value).length > 0
}

export function shouldShowUnclassifiedChiusura(rapporto: RapportoLavorativoRecord | null) {
  return normalizeToken(rapporto?.stato_servizio) === "non attivo"
}

export function getChiusuraTipoLabel(record: ChiusuraContrattoRecord) {
  return record.tipo_licenziamento ?? record.tipo_decesso ?? "-"
}

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
  const queryClient = useQueryClient()

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: RIATTIVAZIONI_BOARD_QUERY_KEY,
    queryFn: fetchRiattivazioniBoardData,
  })

  const columns = data?.columns ?? []

  const setBoardData = React.useCallback(
    (updater: (previous: BoardData | undefined) => BoardData | undefined) => {
      queryClient.setQueryData<BoardData>(RIATTIVAZIONI_BOARD_QUERY_KEY, (previous) =>
        updater(previous),
      )
    },
    [queryClient],
  )

  const invalidateBoard = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: RIATTIVAZIONI_BOARD_QUERY_KEY })
  }, [queryClient])

  const updateCard = React.useCallback(
    (
      recordId: string,
      updater: (card: RiattivazioniBoardCardData) => RiattivazioniBoardCardData,
    ) => {
      setBoardData((previous) => {
        if (!previous) return previous
        return {
          columns: previous.columns.map((column) => ({
            ...column,
            cards: column.cards.map((card) => (card.id === recordId ? updater(card) : card)),
          })),
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
      let movedCard: RiattivazioniBoardCardData | null = null
      const removed = previous.columns.map((column) => {
        if (column.cards.some((card) => card.id === recordId)) {
          const remainingCards = column.cards.filter((card) => {
            if (card.id !== recordId) return true
            movedCard = {
              ...card,
              stage: targetStageId,
              record: {
                ...card.record,
                stato_riattivazione_famiglia: targetStageId,
              },
            }
            return false
          })
          return { ...column, cards: remainingCards }
        }
        return column
      })
      if (!movedCard) return previous
      return {
        columns: removed.map((column) =>
          column.id === targetStageId
            ? { ...column, cards: [movedCard as RiattivazioniBoardCardData, ...column.cards] }
            : column,
        ),
      }
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
