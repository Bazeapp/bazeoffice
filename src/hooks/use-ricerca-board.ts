import * as React from "react"

import {
  fetchFamiglie,
  fetchLookupValues,
  fetchProcessiMatching,
  updateRecord,
} from "@/lib/anagrafiche-api"
import type { LookupValueRecord } from "@/types"

type GenericRow = Record<string, unknown>
type LookupColorMap = Record<string, Record<string, string>>

type StageDefinition = {
  id: string
  label: string
  color: string | null
}

type StageMetadata = {
  definitions: StageDefinition[]
  aliases: Map<string, string>
}

const BOARD_FETCH_PAGE_SIZE = 2000

const VISIBLE_STAGE_ORDER = [
  "fare ricerca",
  "selezione inviata",
  "selezione inviata in attesa di feedback",
  "fase di colloqui",
  "in prova con lavoratore",
  "match",
  "no match",
  "stand by",
] as const

export type RicercaBoardCardData = {
  id: string
  stage: string
  nomeFamiglia: string
  cognomeFamiglia: string
  email: string
  telefono: string
  operatorId: string | null
  oreSettimanali: string
  giorniSettimanali: string
  deadline: string
  zona: string
  tipoLavoroBadge: string | null
  tipoLavoroColor: string | null
  tipoRapportoBadge: string | null
  tipoRapportoColor: string | null
}

export type RicercaBoardColumnData = {
  id: string
  label: string
  color: string | null
  cards: RicercaBoardCardData[]
}

type UseRicercaBoardState = {
  loading: boolean
  error: string | null
  columns: RicercaBoardColumnData[]
  moveCard: (processId: string, targetStageId: string) => Promise<void>
}

function asRowArray(input: unknown): GenericRow[] {
  if (!Array.isArray(input)) return []
  return input.filter(
    (item): item is GenericRow => Boolean(item) && typeof item === "object"
  )
}

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized ? normalized : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}

function getFirstArrayValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = toStringValue(item)
      if (normalized) return normalized
    }
  }

  return toStringValue(value)
}

function extractFirstNumberToken(value: unknown): string | null {
  const raw = toStringValue(value)
  if (!raw) return null
  const match = raw.match(/\d+/)
  return match ? match[0] : null
}

function formatItalianDate(value: unknown): string {
  const raw = toStringValue(value)
  if (!raw) return "-"

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return "-"

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null
  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

function buildLookupColorMap(rows: LookupValueRecord[]): LookupColorMap {
  return rows.reduce<LookupColorMap>((acc, current) => {
    if (!current.is_active) return acc
    const color = readLookupColor(current.metadata)
    if (!color) return acc

    const domain = `${current.entity_table}.${current.entity_field}`
    if (!acc[domain]) acc[domain] = {}

    acc[domain][normalizeLookupToken(current.value_key)] = color
    acc[domain][normalizeLookupToken(current.value_label)] = color
    return acc
  }, {})
}

function buildStageMetadata(rows: LookupValueRecord[]): StageMetadata {
  const stageRows = rows
    .filter(
      (row) =>
        row.is_active &&
        row.entity_table === "processi_matching" &&
        row.entity_field === "stato_res" &&
        Boolean(toStringValue(row.value_key)) &&
        Boolean(toStringValue(row.value_label))
    )
    .sort((a, b) => {
      const left = a.sort_order ?? Number.MAX_SAFE_INTEGER
      const right = b.sort_order ?? Number.MAX_SAFE_INTEGER
      if (left !== right) return left - right
      return a.value_label.localeCompare(b.value_label, "it")
    })

  const definitions: StageDefinition[] = []
  const aliases = new Map<string, string>()

  for (const row of stageRows) {
    const id = toStringValue(row.value_key)
    const label = toStringValue(row.value_label)
    if (!id || !label) continue

    definitions.push({
      id,
      label,
      color: readLookupColor(row.metadata),
    })

    aliases.set(normalizeLookupToken(id), id)
    aliases.set(normalizeLookupToken(label), id)
  }

  return {
    definitions,
    aliases,
  }
}

function normalizeStageName(value: string) {
  return normalizeLookupToken(value)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

function resolveBadgeColor(
  lookupColors: LookupColorMap,
  entityTable: string,
  entityField: string,
  value: string | null
) {
  if (!value) return null
  const domain = `${entityTable}.${entityField}`
  return lookupColors[domain]?.[normalizeLookupToken(value)] ?? null
}

async function fetchRicercaBoardData(): Promise<RicercaBoardColumnData[]> {
  async function fetchAllRows(
    fetchPage: (offset: number) => Promise<{ rows: GenericRow[]; total: number }>
  ) {
    const firstPage = await fetchPage(0)
    const rows = [...firstPage.rows]
    const total = firstPage.total

    if (rows.length >= total) return rows

    for (let offset = rows.length; offset < total; offset += BOARD_FETCH_PAGE_SIZE) {
      const page = await fetchPage(offset)
      rows.push(...page.rows)
    }

    return rows
  }

  const [processesResult, familiesResult, lookupResult] = await Promise.all([
    fetchAllRows((offset) =>
      fetchProcessiMatching({
        limit: BOARD_FETCH_PAGE_SIZE,
        offset,
        orderBy: [{ field: "aggiornato_il", ascending: false }],
      }).then((result) => ({
        rows: asRowArray(result.rows),
        total: result.total,
      }))
    ),
    fetchAllRows((offset) =>
      fetchFamiglie({
        limit: BOARD_FETCH_PAGE_SIZE,
        offset,
        orderBy: [{ field: "aggiornato_il", ascending: false }],
      }).then((result) => ({
        rows: asRowArray(result.rows),
        total: result.total,
      }))
    ),
    fetchLookupValues(),
  ])

  const processRows = processesResult
  const familyRows = familiesResult
  const lookupRows = lookupResult.rows

  const lookupColors = buildLookupColorMap(lookupRows)
  const stageMetadata = buildStageMetadata(lookupRows)
  const stageDefinitions = stageMetadata.definitions
  const familyById = new Map<string, GenericRow>()

  for (const family of familyRows) {
    const id = toStringValue(family.id)
    if (!id) continue
    familyById.set(id, family)
  }

  const cardsByStageId = new Map<string, RicercaBoardCardData[]>()
  for (const stage of stageDefinitions) {
    cardsByStageId.set(stage.id, [])
  }

  const unknownStages = new Map<string, RicercaBoardColumnData>()

  for (const process of processRows) {
    const id = toStringValue(process.id)
    const stageRaw = toStringValue(process.stato_res)
    const famigliaId = toStringValue(process.famiglia_id)
    if (!id || !stageRaw || !famigliaId) continue

    const stage =
      stageMetadata.aliases.get(normalizeLookupToken(stageRaw)) ?? stageRaw

    const family = familyById.get(famigliaId)
    if (!family) continue

    const cognomeFamiglia = toStringValue(family.cognome) ?? ""
    const nomeFamiglia = [toStringValue(family.nome), cognomeFamiglia]
      .filter((value): value is string => Boolean(value))
      .join(" ")

    const tipoLavoroBadge = getFirstArrayValue(process.tipo_lavoro)
    const tipoRapportoBadge = getFirstArrayValue(process.tipo_rapporto)

    const card: RicercaBoardCardData = {
      id,
      stage,
      nomeFamiglia: nomeFamiglia || "-",
      cognomeFamiglia,
      email: toStringValue(family.email) ?? "-",
      telefono: toStringValue(family.telefono) ?? "-",
      operatorId: toStringValue(process.referente_ricerca_e_selezione_id),
      oreSettimanali: toStringValue(process.ore_settimanale) ?? "-",
      giorniSettimanali:
        toStringValue(process.numero_giorni_settimanali) ??
        extractFirstNumberToken(process.frequenza_rapporto) ??
        "-",
      deadline: formatItalianDate(process.data_limite_invio_selezione),
      zona: toStringValue(process.luogo_id) ?? "-",
      tipoLavoroBadge,
      tipoLavoroColor: resolveBadgeColor(
        lookupColors,
        "processi_matching",
        "tipo_lavoro",
        tipoLavoroBadge
      ),
      tipoRapportoBadge,
      tipoRapportoColor: resolveBadgeColor(
        lookupColors,
        "processi_matching",
        "tipo_rapporto",
        tipoRapportoBadge
      ),
    }

    const knownColumn = cardsByStageId.get(stage)
    if (knownColumn) {
      knownColumn.push(card)
      continue
    }

    if (!unknownStages.has(stage)) {
      unknownStages.set(stage, {
        id: stage,
        label: stage,
        color: null,
        cards: [],
      })
    }
    unknownStages.get(stage)?.cards.push(card)
  }

  const orderedColumns = [
    ...stageDefinitions.map((stage) => ({
      id: stage.id,
      label: stage.label,
      color: stage.color,
      cards: cardsByStageId.get(stage.id) ?? [],
    })),
    ...unknownStages.values(),
  ]

  const visibleStageNames = new Set(VISIBLE_STAGE_ORDER.map(normalizeStageName))
  const filteredColumns = orderedColumns.filter((column) =>
    visibleStageNames.has(normalizeStageName(column.label)) ||
    visibleStageNames.has(normalizeStageName(column.id))
  )

  const sortOrder = new Map(
    VISIBLE_STAGE_ORDER.map((stage, index) => [normalizeStageName(stage), index])
  )

  filteredColumns.sort((left, right) => {
    const leftOrder =
      sortOrder.get(normalizeStageName(left.label)) ??
      sortOrder.get(normalizeStageName(left.id)) ??
      Number.MAX_SAFE_INTEGER
    const rightOrder =
      sortOrder.get(normalizeStageName(right.label)) ??
      sortOrder.get(normalizeStageName(right.id)) ??
      Number.MAX_SAFE_INTEGER

    return leftOrder - rightOrder
  })

  return filteredColumns
}

export function useRicercaBoard(): UseRicercaBoardState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [columns, setColumns] = React.useState<RicercaBoardColumnData[]>([])

  const moveCard = React.useCallback(
    async (processId: string, targetStageId: string) => {
      const previous = columns

      setColumns((current) => {
        let movedCard: RicercaBoardCardData | null = null

        const nextColumns = current.map((column) => {
          if (column.cards.some((card) => card.id === processId)) {
            const remainingCards = column.cards.filter((card) => {
              if (card.id !== processId) return true
              movedCard = { ...card, stage: targetStageId }
              return false
            })
            return { ...column, cards: remainingCards }
          }

          return column
        })

        if (!movedCard) return current

        return nextColumns.map((column) =>
          column.id === targetStageId
            ? { ...column, cards: [movedCard as RicercaBoardCardData, ...column.cards] }
            : column
        )
      })

      try {
        await updateRecord("processi_matching", processId, {
          stato_res: targetStageId,
        })
      } catch (caughtError) {
        setColumns(previous)
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando stato ricerca"
        )
      }
    },
    [columns]
  )

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchRicercaBoardData()
        if (cancelled) return
        setColumns(data)
      } catch (caughtError) {
        if (cancelled) return
        const message =
          caughtError instanceof Error ? caughtError.message : "Errore caricamento ricerca"
        setError(message)
        setColumns([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return {
    loading,
    error,
    columns,
    moveCard,
  }
}
