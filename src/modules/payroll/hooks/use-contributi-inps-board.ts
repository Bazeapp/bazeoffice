import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { useMoveMutation, usePatchMutation } from "@/hooks/use-board-mutations"

import { fetchAssunzioniNamesByRapportoIds } from "@/modules/gestione-contrattuale/queries"
import { fetchLookupValues } from "@/lib/lookup-values"
import { updateRecord } from "@/lib/record-crud"
import {
  normalizeComparableToken,
  readLookupColor,
  toStringValue,
} from "@/lib/value-utils"
import { fetchContributiInpsByPeriod } from "../queries/fetch-contributi-inps-by-period"
import { fetchMesiCalendarioAll } from "../queries/fetch-mesi-calendario-all"
import { fetchRapportiLavorativiAll } from "@/modules/rapporti/queries"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"

const CONTRIBUTI_REALTIME_TABLES = [
  "contributi_inps",
  "rapporti_lavorativi",
  "famiglie",
  "lavoratori",
]
import { getRapportoFamilyLabel, getRapportoWorkerLabel, resolveRapportoStatus } from "@/modules/rapporti/lib"
import { getQuarterDateRange } from "../lib/contributi-quarter"
import type {
  ContributoInpsRecord,
  LookupValueRecord,
  MeseCalendarioRecord,
  RapportoLavorativoRecord,
} from "@/types"

import type {
  ContributoInpsBoardCardData,
  ContributoQuarterValue,
} from "../types"
type ContributoStageDefinition = {
  id: string
  label: string
  color: string
}

type StageMetadata = {
  definitions: ContributoStageDefinition[]
  aliases: Map<string, string>
}

type UseContributiInpsBoardState = {
  loading: boolean
  error: string | null
  stages: ContributoStageDefinition[]
  cards: ContributoInpsBoardCardData[]
  activeRapportiCount: number
  moveCard: (recordId: string, targetStageId: string) => Promise<void>
  patchCard: (recordId: string, patch: Partial<ContributoInpsRecord>) => Promise<void>
}

const DEFAULT_STAGE_DEFINITIONS: ContributoStageDefinition[] = [
  { id: "Da richiedere", label: "Da richiedere", color: "sky" },
  { id: "PagoPA ricevuto", label: "PagoPA ricevuto", color: "cyan" },
  { id: "Inviato alla famiglia", label: "Inviato alla famiglia", color: "amber" },
  { id: "Pagato", label: "Pagato", color: "green" },
]

const LEGACY_STAGE_ALIASES: Record<string, string> = {
  todo: "Da richiedere",
  "to do": "Da richiedere",
  inviato: "Inviato alla famiglia",
  "inviato alla famiglia": "Inviato alla famiglia",
  "inviato pagopa": "Inviato alla famiglia",
  inviati: "Inviato alla famiglia",
  pagopa: "PagoPA ricevuto",
  "pagopa ricevuto": "PagoPA ricevuto",
  pagato: "Pagato",
}

function normalizeRecordKey(value: unknown) {
  const normalized = toStringValue(value)?.trim() ?? null
  return normalized || null
}

function readLookupSortOrder(value: LookupValueRecord["sort_order"]) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function getStageColorFallback(value: string | null | undefined) {
  const token = normalizeComparableToken(value)
  if (!token) return "sky"
  if (token.includes("pagato")) return "green"
  if (token.includes("inviat")) return "amber"
  if (token.includes("pagopa")) return "cyan"
  if (token.includes("richied")) return "sky"
  return "sky"
}

function isActiveRapporto(
  rapporto: Pick<
    RapportoLavorativoRecord,
    "stato_assunzione" | "data_fine_rapporto"
  >
) {
  return normalizeComparableToken(resolveRapportoStatus(rapporto)) === "attivo"
}

function buildStageMetadata(rows: LookupValueRecord[]): StageMetadata {
  const lookupRows = rows.filter(
    (row) =>
      row.is_active &&
      row.entity_table === "contributi_inps" &&
      row.entity_field === "stato_contributi_inps"
  )

  if (lookupRows.length === 0) {
    const aliases = new Map<string, string>()

    for (const stage of DEFAULT_STAGE_DEFINITIONS) {
      aliases.set(normalizeComparableToken(stage.id), stage.id)
      aliases.set(normalizeComparableToken(stage.label), stage.id)
    }

    for (const [legacyAlias, stageId] of Object.entries(LEGACY_STAGE_ALIASES)) {
      aliases.set(normalizeComparableToken(legacyAlias), stageId)
    }

    return {
      definitions: DEFAULT_STAGE_DEFINITIONS,
      aliases,
    }
  }

  const aliases = new Map<string, string>()
  const definitionsById = new Map<
    string,
    ContributoStageDefinition & { sortOrder: number | null }
  >()

  for (const row of lookupRows) {
    const valueKey = toStringValue(row.value_key)
    const valueLabel = toStringValue(row.value_label)
    const stageId = valueKey ?? valueLabel
    if (!stageId) continue

    const normalizedStageId = normalizeComparableToken(stageId)
    const resolvedLabel = valueLabel ?? valueKey ?? stageId
    const existing = definitionsById.get(stageId)
    const nextSortOrder = readLookupSortOrder(row.sort_order)

    definitionsById.set(stageId, {
      id: stageId,
      label: resolvedLabel,
      color: readLookupColor(row.metadata) ?? existing?.color ?? getStageColorFallback(resolvedLabel),
      sortOrder: nextSortOrder ?? existing?.sortOrder ?? null,
    })

    aliases.set(normalizedStageId, stageId)
    if (valueKey) aliases.set(normalizeComparableToken(valueKey), stageId)
    if (valueLabel) aliases.set(normalizeComparableToken(valueLabel), stageId)
  }

  for (const stage of DEFAULT_STAGE_DEFINITIONS) {
    const resolvedId =
      aliases.get(normalizeComparableToken(stage.id)) ??
      aliases.get(normalizeComparableToken(stage.label)) ??
      null

    if (!resolvedId) continue

    aliases.set(normalizeComparableToken(stage.id), resolvedId)
    aliases.set(normalizeComparableToken(stage.label), resolvedId)
  }

  for (const [legacyAlias, stageId] of Object.entries(LEGACY_STAGE_ALIASES)) {
    const resolvedId =
      aliases.get(normalizeComparableToken(stageId)) ??
      aliases.get(normalizeComparableToken(legacyAlias)) ??
      null

    if (resolvedId) {
      aliases.set(normalizeComparableToken(legacyAlias), resolvedId)
    }
  }

  const definitions = Array.from(definitionsById.values())
    .sort((left, right) => {
      const leftOrder = left.sortOrder ?? Number.POSITIVE_INFINITY
      const rightOrder = right.sortOrder ?? Number.POSITIVE_INFINITY
      if (leftOrder !== rightOrder) return leftOrder - rightOrder
      return left.label.localeCompare(right.label, "it")
    })
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      color: definition.color,
    }))

  return {
    definitions: definitions.length > 0 ? definitions : DEFAULT_STAGE_DEFINITIONS,
    aliases,
  }
}

function parseQuarterReference(
  value: string | null | undefined
): { quarter: ContributoQuarterValue; year: number } | null {
  const raw = toStringValue(value)
  if (!raw) return null

  const normalized = normalizeComparableToken(raw)
  const quarterMatch =
    normalized.match(/\bq\s*([1-4])\b/i) ??
    normalized.match(/\btrimestre\s*([1-4])\b/i) ??
    normalized.match(/\b([1-4])\s*trimestre\b/i)
  const yearMatch = normalized.match(/\b(20\d{2})\b/)

  if (!quarterMatch?.[1] || !yearMatch?.[1]) return null

  return {
    quarter: `Q${quarterMatch[1]}` as ContributoQuarterValue,
    year: Number(yearMatch[1]),
  }
}

function getQuarterValueFromDate(value: string | null | undefined): ContributoQuarterValue | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const month = date.getUTCMonth()
  if (month <= 2) return "Q1"
  if (month <= 5) return "Q2"
  if (month <= 8) return "Q3"
  return "Q4"
}

function getYearFromDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.getUTCFullYear()
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatQuarterLabel(
  quarter: ContributoQuarterValue | null,
  year: number | null,
  fallback: string | null | undefined
) {
  if (quarter && year) return `${quarter} ${year}`
  return fallback?.trim() || "Trimestre non disponibile"
}

function buildQuarterIndex(rows: MeseCalendarioRecord[]) {
  const byId = new Map<string, MeseCalendarioRecord>()
  const byToken = new Map<string, MeseCalendarioRecord>()

  for (const row of rows) {
    if (row.id) byId.set(row.id, row)

    const token = normalizeComparableToken(row.trimestre_id)
    if (!token) continue

    const current = byToken.get(token)
    const currentDate = current?.data_inizio ? new Date(current.data_inizio).getTime() : Number.POSITIVE_INFINITY
    const nextDate = row.data_inizio ? new Date(row.data_inizio).getTime() : Number.POSITIVE_INFINITY
    if (!current || nextDate < currentDate) {
      byToken.set(token, row)
    }
  }

  return { byId, byToken }
}

async function fetchContributiBoardData(
  selectedYear: number,
  selectedQuarter: ContributoQuarterValue
): Promise<{
  stages: ContributoStageDefinition[]
  cards: ContributoInpsBoardCardData[]
  activeRapportiCount: number
}> {
  const quarterRange = getQuarterDateRange(selectedYear, selectedQuarter)
  const [contributiResult, mesiResult, rapportiResult, lookupResult] = await Promise.all([
    quarterRange
      ? fetchContributiInpsByPeriod(quarterRange.start, quarterRange.end)
      : Promise.resolve({ rows: [], total: 0, columns: [], groups: [] }),
    fetchMesiCalendarioAll(500),
    fetchRapportiLavorativiAll(
      3000,
      // Solo le colonne usate dalla card contributi (board + view). Il dettaglio
      // rifetcha il rapporto full via rapporti_lavorativi_by_ids → trim sicuro.
      "id,id_rapporto,ticket_id,stato_assunzione,codice_datore_webcolf,codice_dipendente_webcolf,cognome_nome_datore_proper,nome_lavoratore_per_url,tipo_contratto,tipo_rapporto",
    ),
    fetchLookupValues(),
  ])

  // Le RPC ritornano TableRow generico: castiamo ai record tipizzati una volta
  // qui, così il resto della funzione resta type-safe (build tsc -b).
  const contributiRows = contributiResult.rows as unknown as ContributoInpsRecord[]
  const mesiRows = mesiResult.rows as unknown as MeseCalendarioRecord[]
  const rapportiRows = rapportiResult.rows as unknown as RapportoLavorativoRecord[]

  const stageMetadata = buildStageMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const rapportoById = new Map(
    rapportiRows
      .map((rapporto) => {
        const key = normalizeRecordKey(rapporto.id)
        return key ? ([key, rapporto] as const) : null
      })
      .filter(Boolean) as Array<readonly [string, RapportoLavorativoRecord]>
  )
  const rapportoByExternalId = new Map(
    rapportiRows
      .flatMap((rapporto) =>
        [
          rapporto.id_rapporto,
          rapporto.ticket_id,
        ]
          .map((key) => normalizeRecordKey(key))
          .filter(Boolean)
          .map((key) => [key as string, rapporto] as const)
      )
  )
  const quarterIndex = buildQuarterIndex(mesiRows)
  const activeRapportiCount = rapportiRows.filter((rapporto) => isActiveRapporto(rapporto)).length

  const resolveRapporto = (record: ContributoInpsRecord) => {
    const rapportoKey = normalizeRecordKey(record.rapporto_lavorativo_id)
    const ticketKey = normalizeRecordKey(record.ticket_id)
    return rapportoKey
      ? rapportoById.get(rapportoKey) ?? rapportoByExternalId.get(rapportoKey) ?? null
      : ticketKey
        ? rapportoByExternalId.get(ticketKey) ?? null
        : null
  }

  // Nomi dalle assunzioni collegate (priorità sul nome del rapporto), solo per
  // i rapporti effettivamente referenziati dai contributi del periodo.
  const referencedRapportoIds = Array.from(
    new Set(
      contributiRows
        .map((record) => resolveRapporto(record)?.id)
        .filter((id): id is string => Boolean(id))
    )
  )
  const assunzioneNamesByRapporto = await fetchAssunzioniNamesByRapportoIds(referencedRapportoIds)

  const cards = contributiRows.flatMap((record) => {
    const resolvedQuarter =
      (record.trimestre_id ? quarterIndex.byId.get(record.trimestre_id) : null) ??
      (record.trimestre_id ? quarterIndex.byToken.get(normalizeComparableToken(record.trimestre_id)) : null) ??
      null
    const parsedQuarterReference = parseQuarterReference(record.trimestre_id)
    const recordQuarter =
      getQuarterValueFromDate(record.data_ora_creazione ?? record.creato_il ?? record.aggiornato_il) ?? null
    const recordYear =
      getYearFromDate(record.data_ora_creazione ?? record.creato_il ?? record.aggiornato_il) ?? null

    const matchesSelectedQuarter =
      (recordQuarter === selectedQuarter && recordYear === selectedYear) ||
      (resolvedQuarter?.data_inizio
        ? getQuarterValueFromDate(resolvedQuarter.data_inizio) === selectedQuarter &&
          getYearFromDate(resolvedQuarter.data_inizio) === selectedYear
        : false) ||
      (parsedQuarterReference
        ? parsedQuarterReference.quarter === selectedQuarter &&
          parsedQuarterReference.year === selectedYear
        : false)

    if (!matchesSelectedQuarter) return []

    const stage =
      aliases.get(normalizeComparableToken(record.stato_contributi_inps)) ?? DEFAULT_STAGE_DEFINITIONS[0]?.id ?? ""
    const rapporto = resolveRapporto(record)
    const assunzioneNames = rapporto ? assunzioneNamesByRapporto[rapporto.id] ?? null : null

    const nomeFamiglia = rapporto
      ? getRapportoFamilyLabel(rapporto, null, assunzioneNames?.datore)
      : "Famiglia non disponibile"
    const nomeLavoratore = rapporto
      ? getRapportoWorkerLabel(rapporto, null, assunzioneNames?.lavoratore)
      : "Lavoratore non disponibile"
    const quarterValue =
      recordQuarter ??
      getQuarterValueFromDate(resolvedQuarter?.data_inizio ?? null) ??
      parsedQuarterReference?.quarter ??
      null
    const quarterYear =
      recordYear ??
      getYearFromDate(resolvedQuarter?.data_inizio ?? null) ??
      parsedQuarterReference?.year ??
      null

    return [
      {
        id: record.id,
        stage,
        record,
        rapporto,
        trimestre: resolvedQuarter,
        nomeFamiglia,
        nomeLavoratore,
        nomeCompleto: `${nomeFamiglia} – ${nomeLavoratore}`,
        trimestreLabel: formatQuarterLabel(quarterValue, quarterYear, record.trimestre_id),
        importoLabel: formatCurrency(record.importo_contributi_inps),
        pagopaLabel: formatCurrency(record.valore_pagopa),
      } satisfies ContributoInpsBoardCardData,
    ]
  })

  return {
    stages,
    cards,
    activeRapportiCount,
  }
}

type BoardData = {
  stages: ContributoStageDefinition[]
  cards: ContributoInpsBoardCardData[]
  activeRapportiCount: number
}

export function useContributiInpsBoard(
  selectedYear: number,
  selectedQuarter: ContributoQuarterValue
): UseContributiInpsBoardState {
  const boardQueryKey = React.useMemo(
    () => ["contributi-inps-board", selectedYear, selectedQuarter] as const,
    [selectedYear, selectedQuarter],
  )

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: boardQueryKey,
    queryFn: () => fetchContributiBoardData(selectedYear, selectedQuarter),
  })

  const stages = data?.stages ?? DEFAULT_STAGE_DEFINITIONS
  const cards = data?.cards ?? []
  const activeRapportiCount = data?.activeRapportiCount ?? 0

  const { invalidateBoard } = useBoardQueryCache<BoardData>(boardQueryKey)

  const moveMutation = useMoveMutation<
    { recordId: string; targetStageId: string },
    unknown,
    BoardData
  >({
    queryKey: boardQueryKey,
    mutationFn: ({ recordId, targetStageId }) =>
      updateRecord("contributi_inps", recordId, { stato_contributi_inps: targetStageId }),
    applyOptimistic: (previous, { recordId, targetStageId }) => {
      if (!previous) return previous
      return {
        ...previous,
        cards: previous.cards.map((card) =>
          card.id === recordId
            ? {
                ...card,
                stage: targetStageId,
                record: { ...card.record, stato_contributi_inps: targetStageId },
              }
            : card,
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

  const patchMutation = usePatchMutation<
    { recordId: string; patch: Partial<ContributoInpsRecord> },
    unknown,
    BoardData
  >({
    queryKey: boardQueryKey,
    mutationFn: ({ recordId, patch }) =>
      updateRecord("contributi_inps", recordId, patch as Record<string, unknown>),
    applyOptimistic: (previous, { recordId, patch }) => {
      if (!previous) return previous
      return {
        ...previous,
        cards: previous.cards.map((card) =>
          card.id === recordId
            ? {
                ...card,
                record: { ...card.record, ...patch },
                importoLabel:
                  typeof patch.importo_contributi_inps === "number"
                    ? formatCurrency(patch.importo_contributi_inps)
                    : patch.importo_contributi_inps === null
                      ? null
                      : card.importoLabel,
                pagopaLabel:
                  typeof patch.valore_pagopa === "number"
                    ? formatCurrency(patch.valore_pagopa)
                    : patch.valore_pagopa === null
                      ? null
                      : card.pagopaLabel,
              }
            : card,
        ),
      }
    },
  })

  const patchCard = React.useCallback(
    async (recordId: string, patch: Partial<ContributoInpsRecord>) => {
      await patchMutation.mutateAsync({ recordId, patch })
    },
    [patchMutation],
  )

  useRealtimeBoardSync({
    tables: CONTRIBUTI_REALTIME_TABLES,
    reload: invalidateBoard,
  })

  const error =
    moveMutation.error instanceof Error
      ? moveMutation.error.message
      : patchMutation.error instanceof Error
        ? patchMutation.error.message
        : queryError instanceof Error
          ? queryError.message
          : null

  return {
    loading: isLoading,
    error,
    stages,
    cards,
    activeRapportiCount,
    moveCard,
    patchCard,
  }
}
