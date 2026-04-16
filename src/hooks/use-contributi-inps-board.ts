import * as React from "react"

import {
  fetchContributiInps,
  fetchLookupValues,
  fetchMesiCalendario,
  fetchRapportiLavorativi,
  updateRecord,
} from "@/lib/anagrafiche-api"
import type {
  ContributoInpsRecord,
  LookupValueRecord,
  MeseCalendarioRecord,
  RapportoLavorativoRecord,
} from "@/types"

type ContributoStageDefinition = {
  id: string
  label: string
  color: string
}

type StageMetadata = {
  definitions: ContributoStageDefinition[]
  aliases: Map<string, string>
}

export type ContributoQuarterValue = "Q1" | "Q2" | "Q3" | "Q4"

export type ContributoInpsBoardCardData = {
  id: string
  stage: string
  record: ContributoInpsRecord
  rapporto: RapportoLavorativoRecord | null
  trimestre: MeseCalendarioRecord | null
  nomeFamiglia: string
  nomeLavoratore: string
  nomeCompleto: string
  trimestreLabel: string
  importoLabel: string | null
  pagopaLabel: string | null
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
  inviati: "Inviato alla famiglia",
  pagopa: "PagoPA ricevuto",
  "pagopa ricevuto": "PagoPA ricevuto",
  pagato: "Pagato",
}

const QUARTER_ORDER: ContributoQuarterValue[] = ["Q1", "Q2", "Q3", "Q4"]

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

function toStringValue(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return null
}

function normalizeRecordKey(value: unknown) {
  const normalized = toStringValue(value)?.trim() ?? null
  return normalized || null
}

function readLookupSortOrder(value: LookupValueRecord["sort_order"]) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null
  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

function getStageColorFallback(value: string | null | undefined) {
  const token = normalizeToken(value)
  if (!token) return "sky"
  if (token.includes("pagato")) return "green"
  if (token.includes("inviat")) return "amber"
  if (token.includes("pagopa")) return "cyan"
  if (token.includes("richied")) return "sky"
  return "sky"
}

function isActiveRapporto(
  rapporto: Pick<RapportoLavorativoRecord, "stato_rapporto" | "stato_servizio">
) {
  const token = normalizeToken(rapporto.stato_servizio ?? rapporto.stato_rapporto)
  if (!token) return false
  if (token === "attivo") return true
  if (token.includes("non attivo")) return false
  if (token.includes("attivo")) return true
  if (token.includes("in attivazione")) return true
  if (token.includes("in corso")) return true
  return false
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
      aliases.set(normalizeToken(stage.id), stage.id)
      aliases.set(normalizeToken(stage.label), stage.id)
    }

    for (const [legacyAlias, stageId] of Object.entries(LEGACY_STAGE_ALIASES)) {
      aliases.set(normalizeToken(legacyAlias), stageId)
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

    const normalizedStageId = normalizeToken(stageId)
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
    if (valueKey) aliases.set(normalizeToken(valueKey), stageId)
    if (valueLabel) aliases.set(normalizeToken(valueLabel), stageId)
  }

  for (const stage of DEFAULT_STAGE_DEFINITIONS) {
    const resolvedId =
      aliases.get(normalizeToken(stage.id)) ??
      aliases.get(normalizeToken(stage.label)) ??
      null

    if (!resolvedId) continue

    aliases.set(normalizeToken(stage.id), resolvedId)
    aliases.set(normalizeToken(stage.label), resolvedId)
  }

  for (const [legacyAlias, stageId] of Object.entries(LEGACY_STAGE_ALIASES)) {
    const resolvedId =
      aliases.get(normalizeToken(stageId)) ??
      aliases.get(normalizeToken(legacyAlias)) ??
      null

    if (resolvedId) {
      aliases.set(normalizeToken(legacyAlias), resolvedId)
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

  const normalized = normalizeToken(raw)
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
  const month = date.getMonth()
  if (month <= 2) return "Q1"
  if (month <= 5) return "Q2"
  if (month <= 8) return "Q3"
  return "Q4"
}

function getYearFromDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.getFullYear()
}

function getQuarterDateRange(year: number, quarter: ContributoQuarterValue) {
  const quarterIndex = QUARTER_ORDER.indexOf(quarter)
  if (quarterIndex < 0) return null

  const startMonth = quarterIndex * 3
  const start = new Date(Date.UTC(year, startMonth, 1))
  const end = new Date(Date.UTC(year, startMonth + 3, 0))

  return {
    start: start.toISOString(),
    end: new Date(
      Date.UTC(
        end.getUTCFullYear(),
        end.getUTCMonth(),
        end.getUTCDate(),
        23,
        59,
        59,
        999
      )
    ).toISOString(),
  }
}

function buildQuarterRowsFilter(
  selectedYear: number,
  selectedQuarter: ContributoQuarterValue
) {
  const range = getQuarterDateRange(selectedYear, selectedQuarter)
  if (!range) return undefined

  return {
    kind: "group" as const,
    id: `contributi-inps-quarter-${selectedQuarter}-${selectedYear}`,
    logic: "or" as const,
    nodes: [
      {
        kind: "group" as const,
        id: `contributi-inps-data-ora-creazione-${selectedQuarter}-${selectedYear}`,
        logic: "and" as const,
        nodes: [
          {
            kind: "condition" as const,
            id: `contributi-inps-data-ora-creazione-start-${selectedQuarter}-${selectedYear}`,
            field: "data_ora_creazione",
            operator: "gte" as const,
            value: range.start,
          },
          {
            kind: "condition" as const,
            id: `contributi-inps-data-ora-creazione-end-${selectedQuarter}-${selectedYear}`,
            field: "data_ora_creazione",
            operator: "lte" as const,
            value: range.end,
          },
        ],
      },
      {
        kind: "group" as const,
        id: `contributi-inps-creato-il-${selectedQuarter}-${selectedYear}`,
        logic: "and" as const,
        nodes: [
          {
            kind: "condition" as const,
            id: `contributi-inps-creato-il-start-${selectedQuarter}-${selectedYear}`,
            field: "creato_il",
            operator: "gte" as const,
            value: range.start,
          },
          {
            kind: "condition" as const,
            id: `contributi-inps-creato-il-end-${selectedQuarter}-${selectedYear}`,
            field: "creato_il",
            operator: "lte" as const,
            value: range.end,
          },
        ],
      },
      {
        kind: "group" as const,
        id: `contributi-inps-aggiornato-il-${selectedQuarter}-${selectedYear}`,
        logic: "and" as const,
        nodes: [
          {
            kind: "condition" as const,
            id: `contributi-inps-aggiornato-il-start-${selectedQuarter}-${selectedYear}`,
            field: "aggiornato_il",
            operator: "gte" as const,
            value: range.start,
          },
          {
            kind: "condition" as const,
            id: `contributi-inps-aggiornato-il-end-${selectedQuarter}-${selectedYear}`,
            field: "aggiornato_il",
            operator: "lte" as const,
            value: range.end,
          },
        ],
      },
    ],
  }
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

    const token = normalizeToken(row.trimestre_id)
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
  const [contributiResult, mesiResult, rapportiResult, lookupResult] = await Promise.all([
    fetchContributiInps({
      limit: 3000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
      filters: buildQuarterRowsFilter(selectedYear, selectedQuarter),
    }),
    fetchMesiCalendario({
      limit: 500,
      offset: 0,
      orderBy: [{ field: "data_inizio", ascending: false }],
    }),
    fetchRapportiLavorativi({
      limit: 3000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchLookupValues(),
  ])

  const stageMetadata = buildStageMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const rapportoById = new Map(
    rapportiResult.rows
      .map((rapporto) => {
        const key = normalizeRecordKey(rapporto.id)
        return key ? ([key, rapporto] as const) : null
      })
      .filter(Boolean) as Array<readonly [string, RapportoLavorativoRecord]>
  )
  const rapportoByExternalId = new Map(
    rapportiResult.rows
      .flatMap((rapporto) =>
        [
          rapporto.id_rapporto,
          rapporto.ticket_id,
          rapporto.airtable_id,
          rapporto.airtable_record_id,
        ]
          .map((key) => normalizeRecordKey(key))
          .filter(Boolean)
          .map((key) => [key as string, rapporto] as const)
      )
  )
  const quarterIndex = buildQuarterIndex(mesiResult.rows)
  const activeRapportiCount = rapportiResult.rows.filter((rapporto) => isActiveRapporto(rapporto)).length

  const cards = contributiResult.rows.flatMap((record) => {
    const resolvedQuarter =
      (record.trimestre_id ? quarterIndex.byId.get(record.trimestre_id) : null) ??
      (record.trimestre_id ? quarterIndex.byToken.get(normalizeToken(record.trimestre_id)) : null) ??
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
      aliases.get(normalizeToken(record.stato_contributi_inps)) ?? DEFAULT_STAGE_DEFINITIONS[0]?.id ?? ""
    const rapportoKey = normalizeRecordKey(record.rapporto_lavorativo_id)
    const ticketKey = normalizeRecordKey(record.ticket_id)
    const rapporto = rapportoKey
      ? rapportoById.get(rapportoKey) ??
        rapportoByExternalId.get(rapportoKey) ??
        null
      : ticketKey
        ? rapportoByExternalId.get(ticketKey) ?? null
      : null

    const nomeFamiglia = rapporto?.cognome_nome_datore_proper?.trim() || "Famiglia non disponibile"
    const nomeLavoratore = rapporto?.nome_lavoratore_per_url?.trim() || "Lavoratore non disponibile"
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

export function useContributiInpsBoard(
  selectedYear: number,
  selectedQuarter: ContributoQuarterValue
): UseContributiInpsBoardState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [stages, setStages] = React.useState<ContributoStageDefinition[]>(DEFAULT_STAGE_DEFINITIONS)
  const [cards, setCards] = React.useState<ContributoInpsBoardCardData[]>([])
  const [activeRapportiCount, setActiveRapportiCount] = React.useState(0)

  const moveCard = React.useCallback(
    async (recordId: string, targetStageId: string) => {
      const previous = cards

      setCards((current) =>
        current.map((card) =>
          card.id === recordId
            ? {
                ...card,
                stage: targetStageId,
                record: {
                  ...card.record,
                  stato_contributi_inps: targetStageId,
                },
              }
            : card
        )
      )

      try {
        await updateRecord("contributi_inps", recordId, {
          stato_contributi_inps: targetStageId,
        })
      } catch (caughtError) {
        setCards(previous)
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore aggiornando stato contributo INPS"
        )
      }
    },
    [cards]
  )

  const patchCard = React.useCallback(
    async (recordId: string, patch: Partial<ContributoInpsRecord>) => {
      const previous = cards

      setCards((current) =>
        current.map((card) =>
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
            : card
        )
      )

      try {
        await updateRecord("contributi_inps", recordId, patch as Record<string, unknown>)
      } catch (caughtError) {
        setCards(previous)
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore aggiornando contributo INPS"
        )
      }
    },
    [cards]
  )

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await fetchContributiBoardData(selectedYear, selectedQuarter)
        if (cancelled) return
        setStages(data.stages)
        setCards(data.cards)
        setActiveRapportiCount(data.activeRapportiCount)
      } catch (caughtError) {
        if (cancelled) return
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore caricamento contributi INPS"
        )
        setStages(DEFAULT_STAGE_DEFINITIONS)
        setCards([])
        setActiveRapportiCount(0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [selectedQuarter, selectedYear])

  return {
    loading,
    error,
    stages,
    cards,
    activeRapportiCount,
    moveCard,
    patchCard,
  }
}
