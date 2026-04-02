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

function buildQuarterTokenSet(rows: MeseCalendarioRecord[]) {
  return new Set(
    rows
      .flatMap((row) => {
        const parsedQuarter =
          parseQuarterReference(row.trimestre_id) ??
          parseQuarterReference(row.data_inizio)

        return [
          row.id,
          row.trimestre_id,
          parsedQuarter ? `${parsedQuarter.quarter} ${parsedQuarter.year}` : null,
          parsedQuarter ? `${parsedQuarter.year} ${parsedQuarter.quarter}` : null,
          parsedQuarter ? `${parsedQuarter.quarter}-${parsedQuarter.year}` : null,
        ]
      })
      .filter(Boolean)
      .map((value) => normalizeToken(value))
  )
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
  const rapportoById = new Map(rapportiResult.rows.map((rapporto) => [rapporto.id, rapporto]))
  const rapportoByExternalId = new Map(
    rapportiResult.rows
      .flatMap((rapporto) =>
        [rapporto.id_rapporto, rapporto.ticket_id, rapporto.airtable_id, rapporto.airtable_record_id]
          .filter(Boolean)
          .map((key) => [key as string, rapporto] as const)
      )
  )
  const quarterIndex = buildQuarterIndex(mesiResult.rows)
  const activeRapportiCount = rapportiResult.rows.filter((rapporto) => {
    const token = normalizeToken(rapporto.stato_rapporto)
    return token === "attivo" || (token.includes("attivo") && !token.includes("non"))
  }).length

  const selectedQuarterRows = mesiResult.rows.filter(
    (row) =>
      getQuarterValueFromDate(row.data_inizio) === selectedQuarter &&
      getYearFromDate(row.data_inizio) === selectedYear
  )
  const selectedQuarterTokens = buildQuarterTokenSet(selectedQuarterRows)

  const cards = contributiResult.rows.flatMap((record) => {
    const resolvedQuarter =
      (record.trimestre_id ? quarterIndex.byId.get(record.trimestre_id) : null) ??
      (record.trimestre_id ? quarterIndex.byToken.get(normalizeToken(record.trimestre_id)) : null) ??
      null
    const parsedQuarterReference = parseQuarterReference(record.trimestre_id)

    const matchesSelectedQuarter =
      (record.trimestre_id && selectedQuarterTokens.has(normalizeToken(record.trimestre_id))) ||
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
    const rapporto = record.rapporto_lavorativo_id
      ? rapportoById.get(record.rapporto_lavorativo_id) ??
        rapportoByExternalId.get(record.rapporto_lavorativo_id) ??
        null
      : record.ticket_id
        ? rapportoByExternalId.get(record.ticket_id) ?? null
      : null

    const nomeFamiglia = rapporto?.cognome_nome_datore_proper?.trim() || "Famiglia non disponibile"
    const nomeLavoratore = rapporto?.nome_lavoratore_per_url?.trim() || "Lavoratore non disponibile"
    const quarterValue =
      getQuarterValueFromDate(resolvedQuarter?.data_inizio ?? null) ?? parsedQuarterReference?.quarter ?? null
    const quarterYear =
      getYearFromDate(resolvedQuarter?.data_inizio ?? null) ?? parsedQuarterReference?.year ?? null

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
