import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useCreateMutation, useMoveMutation } from "@/hooks/use-board-mutations"

import {
  createRecord,
  fetchLookupValues,
  fetchVariazioniBoard,
  updateRecord,
} from "@/lib/anagrafiche-api"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import { getRapportoTitle } from "@/features/rapporti/rapporti-labels"
import type { LookupValueRecord, RapportoLavorativoRecord, VariazioneContrattualeRecord } from "@/types"

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

type StageMetadata = {
  definitions: VariazioneStageDefinition[]
  aliases: Map<string, string>
}

export type VariazioniBoardCardData = {
  id: string
  stage: string
  record: VariazioneContrattualeRecord
  rapporto: RapportoLavorativoRecord | null
  famiglia: GenericRow | null
  lavoratore: GenericRow | null
  nomeCompleto: string
  dataVariazione: string
  variazioneDaApplicare: string | null
}

export type VariazioniBoardColumnData = {
  id: string
  label: string
  color: string
  cards: VariazioniBoardCardData[]
}

export type VariazioniRapportoOption = {
  id: string
  label: string
  rapporto: RapportoLavorativoRecord
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

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

function toPersonName(row: GenericRow | null) {
  if (!row) return null
  return { cognome: toStringValue(row.cognome), nome: toStringValue(row.nome) }
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

function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null
  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
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

function formatAddressLabel(address: GenericRow | null | undefined) {
  if (!address) return null

  const formatted = toStringValue(address.indirizzo_formattato)
  if (formatted) return formatted

  const street = [toStringValue(address.via), toStringValue(address.civico)]
    .filter(Boolean)
    .join(" ")
    .trim()
  const note = toStringValue(address.note)
  const citta = toStringValue(address.citta)
  const provincia = toStringValue(address.provincia)
  const cap = toStringValue(address.cap)
  const shortNote = note?.split("-")[0]?.trim() || null

  return (
    [street || shortNote, citta, provincia, cap]
      .filter(
        (value, index, values): value is string =>
          Boolean(value) && values.indexOf(value) === index
      )
      .join(" • ") || null
  )
}

function getAddressCap(address: GenericRow | null | undefined) {
  return toStringValue(address?.cap)
}

function buildStageMetadata(rows: LookupValueRecord[]): StageMetadata {
  const aliases = new Map<string, string>()
  const colorByStage = new Map<string, string>()
  const labelByStage = new Map<string, string>()

  for (const stage of DEFAULT_STAGE_DEFINITIONS) {
    aliases.set(normalizeToken(stage.id), stage.id)
    aliases.set(normalizeToken(stage.label), stage.id)
    colorByStage.set(stage.id, stage.color)
    labelByStage.set(stage.id, stage.label)
  }

  const lookupRows = rows.filter(
    (row) =>
      row.is_active &&
      row.entity_table === "variazioni_contrattuali" &&
      row.entity_field === "stato"
  )

  for (const row of lookupRows) {
    const valueKey = toStringValue(row.value_key)
    const valueLabel = toStringValue(row.value_label)
    const resolvedId =
      aliases.get(normalizeToken(valueKey)) ??
      aliases.get(normalizeToken(valueLabel)) ??
      null

    if (!resolvedId) continue

    if (valueKey) aliases.set(normalizeToken(valueKey), resolvedId)
    if (valueLabel) aliases.set(normalizeToken(valueLabel), resolvedId)

    const color = readLookupColor(row.metadata)
    if (color) colorByStage.set(resolvedId, color)
    if (valueLabel) labelByStage.set(resolvedId, valueLabel)
  }

  return {
    definitions: DEFAULT_STAGE_DEFINITIONS.map((stage) => ({
      id: stage.id,
      label: labelByStage.get(stage.id) ?? stage.label,
      color: colorByStage.get(stage.id) ?? stage.color,
    })),
    aliases,
  }
}

async function fetchVariazioniBoardData(): Promise<{
  columns: VariazioniBoardColumnData[]
  rapportoOptions: VariazioniRapportoOption[]
}> {
  const [boardResult, lookupResult] = await Promise.all([
    fetchVariazioniBoard(),
    fetchLookupValues(),
  ])

  const stageMetadata = buildStageMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, VariazioniBoardCardData[]>(
    stages.map((stage) => [stage.id, []])
  )

  for (const row of boardResult.cards) {
    const record = row.record
    const stage = aliases.get(normalizeToken(record.stato))
    if (!stage) continue

    const rapporto = row.rapporto ?? null
    const famiglia = (row.famiglia as GenericRow | null) ?? null
    const baseLavoratore = (row.lavoratore as GenericRow | null) ?? null
    const resolvedWorkerAddress = (row.lavoratoreAddress as GenericRow | null) ?? null
    const workerAddress = formatAddressLabel(resolvedWorkerAddress)
    const workerAddressCap = getAddressCap(resolvedWorkerAddress)
    const lavoratore = baseLavoratore
      ? {
          ...baseLavoratore,
          indirizzo_residenza_completo: workerAddress,
          cap: workerAddressCap,
        }
      : null
    const nomeCompleto = rapporto
      ? getRapportoTitle(rapporto, {
          famiglia: toPersonName(famiglia),
          lavoratore: toPersonName(baseLavoratore),
        })
      : "Rapporto non disponibile"

    const card: VariazioniBoardCardData = {
      id: record.id,
      stage,
      record,
      rapporto,
      famiglia,
      lavoratore,
      nomeCompleto,
      dataVariazione: formatItalianDate(record.data_variazione),
      variazioneDaApplicare: record.variazione_da_applicare,
    }

    cardsByStage.get(stage)?.push(card)
  }

  const columns = stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: cardsByStage.get(stage.id) ?? [],
  }))

  const rapportoOptions = boardResult.rapporti
    .map((row) => ({
      id: row.rapporto.id,
      label: getRapportoTitle(row.rapporto, {
        famiglia: toPersonName((row.famiglia as GenericRow | null) ?? null),
        lavoratore: toPersonName((row.lavoratore as GenericRow | null) ?? null),
      }),
      rapporto: row.rapporto,
    }))
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
    queryFn: fetchVariazioniBoardData,
  })

  const columns = data?.columns ?? []
  const rapportoOptions = data?.rapportoOptions ?? []

  const setBoardData = React.useCallback(
    (updater: (previous: BoardData | undefined) => BoardData | undefined) => {
      queryClient.setQueryData<BoardData>(VARIAZIONI_BOARD_QUERY_KEY, (previous) =>
        updater(previous),
      )
    },
    [queryClient],
  )

  const invalidateBoard = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: VARIAZIONI_BOARD_QUERY_KEY })
  }, [queryClient])

  const updateCard = React.useCallback(
    (
      recordId: string,
      updater: (card: VariazioniBoardCardData) => VariazioniBoardCardData
    ) => {
      setBoardData((previous) => {
        if (!previous) return previous
        return {
          ...previous,
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
    { recordId: string; targetStageId: string },
    unknown,
    BoardData
  >({
    queryKey: VARIAZIONI_BOARD_QUERY_KEY,
    mutationFn: ({ recordId, targetStageId }) =>
      updateRecord("variazioni_contrattuali", recordId, { stato: targetStageId }),
    applyOptimistic: (previous, { recordId, targetStageId }) => {
      if (!previous) return previous
      let movedCard: VariazioniBoardCardData | null = null
      const removed = previous.columns.map((column) => {
        if (column.cards.some((card) => card.id === recordId)) {
          const remainingCards = column.cards.filter((card) => {
            if (card.id !== recordId) return true
            movedCard = { ...card, stage: targetStageId }
            return false
          })
          return { ...column, cards: remainingCards }
        }
        return column
      })
      if (!movedCard) return previous
      return {
        ...previous,
        columns: removed.map((column) =>
          column.id === targetStageId
            ? { ...column, cards: [movedCard as VariazioniBoardCardData, ...column.cards] }
            : column,
        ),
      }
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
