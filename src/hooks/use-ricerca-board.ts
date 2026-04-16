import * as React from "react"

import {
  fetchFamiglie,
  fetchIndirizzi,
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

const BOARD_FETCH_PAGE_SIZE = 500
const PROCESS_BOARD_SELECT_FIELDS = [
  "id",
  "stato_res",
  "famiglia_id",
  "referente_ricerca_e_selezione_id",
  "ore_settimanale",
  "numero_giorni_settimanali",
  "frequenza_rapporto",
  "deadline_mobile",
  "tipo_lavoro",
  "tipo_rapporto",
  "luogo_id",
  "indirizzo_prova_note",
  "indirizzo_prova_comune",
  "indirizzo_prova_provincia",
  "indirizzo_prova_cap",
] as const
const FAMILY_BOARD_SELECT_FIELDS = [
  "id",
  "nome",
  "cognome",
  "email",
  "telefono",
] as const
const ADDRESS_BOARD_SELECT_FIELDS = [
  "entita_id",
  "tipo_indirizzo",
  "via",
  "civico",
  "cap",
  "citta",
  "provincia",
  "indirizzo_formattato",
  "note",
] as const

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
  deadlineRaw: string | null
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
  totalCount: number
  deferred?: boolean
  isLoaded?: boolean
  isLoading?: boolean
  cards: RicercaBoardCardData[]
}

type UseRicercaBoardState = {
  loading: boolean
  error: string | null
  columns: RicercaBoardColumnData[]
  moveCard: (processId: string, targetStageId: string) => Promise<void>
  loadDeferredColumn: (columnId: string) => Promise<void>
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

function isDeferredStage(value: string) {
  const normalized = normalizeStageName(value)
  return normalized === "match" || normalized === "no match"
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
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

function formatZonaFromAddress(address: GenericRow | undefined) {
  if (!address) return null

  const citta = toStringValue(address.citta)
  const cap = toStringValue(address.cap)
  const note = toStringValue(address.note)
  const shortNote = note?.split("-")[0]?.trim() || null

  return (
    [shortNote, citta, cap]
      .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
      .join(" • ") || null
  )
}

function formatLegacyZona(process: GenericRow) {
  return (
    [
      toStringValue(process.indirizzo_prova_note),
      toStringValue(process.indirizzo_prova_comune),
      toStringValue(process.indirizzo_prova_provincia),
      toStringValue(process.indirizzo_prova_cap),
    ]
      .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
      .join(" • ") ||
    toStringValue(process.luogo_id) ||
    "-"
  )
}

function buildStageFilter(
  stages: Array<Pick<StageDefinition, "id" | "label">>,
  idPrefix: string
) {
  if (stages.length === 0) return undefined

  return {
    kind: "group" as const,
    id: `${idPrefix}-stage-filter`,
    logic: "or" as const,
    nodes: stages.map((stage, stageIndex) => {
      const values = Array.from(
        new Set([stage.id, stage.label].filter((value) => Boolean(toStringValue(value))))
      )

      if (values.length <= 1) {
        return {
          kind: "condition" as const,
          id: `${idPrefix}-stage-${stageIndex}-value-0`,
          field: "stato_res",
          operator: "is" as const,
          value: values[0] ?? stage.id,
        }
      }

      return {
        kind: "group" as const,
        id: `${idPrefix}-stage-${stageIndex}`,
        logic: "or" as const,
        nodes: values.map((value, valueIndex) => ({
          kind: "condition" as const,
          id: `${idPrefix}-stage-${stageIndex}-value-${valueIndex}`,
          field: "stato_res",
          operator: "is" as const,
          value,
        })),
      }
    }),
  }
}

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

async function fetchProcessRowsForStages(
  stages: Array<Pick<StageDefinition, "id" | "label">>
) {
  const filters = buildStageFilter(stages, "ricerca-board-processes")

  return fetchAllRows((offset) =>
    fetchProcessiMatching({
      select: [...PROCESS_BOARD_SELECT_FIELDS],
      limit: BOARD_FETCH_PAGE_SIZE,
      offset,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
      filters,
    }).then((result) => ({
      rows: asRowArray(result.rows),
      total: result.total,
    }))
  )
}

async function fetchStageCount(stage: Pick<StageDefinition, "id" | "label">) {
  const result = await fetchProcessiMatching({
    select: ["id"],
    limit: 1,
    offset: 0,
    orderBy: [{ field: "aggiornato_il", ascending: false }],
    filters: buildStageFilter([stage], `ricerca-board-stage-count-${stage.id}`),
  })

  return result.total
}

async function fetchFamiliesByIds(familyIds: string[]) {
  const uniqueFamilyIds = Array.from(new Set(familyIds.filter(Boolean)))
  if (uniqueFamilyIds.length === 0) return []

  const chunks = chunkValues(uniqueFamilyIds, 150)
  const pages = await Promise.all(
    chunks.map((ids, index) =>
      fetchFamiglie({
        select: [...FAMILY_BOARD_SELECT_FIELDS],
        limit: ids.length,
        offset: 0,
        orderBy: [{ field: "aggiornato_il", ascending: false }],
        filters: {
          kind: "group",
          id: `ricerca-board-famiglie-${index}`,
          logic: "and",
          nodes: [
            {
              kind: "condition",
              id: `ricerca-board-famiglie-id-${index}`,
              field: "id",
              operator: "in",
              value: ids.join(","),
            },
          ],
        },
      }).then((result) => asRowArray(result.rows))
    )
  )

  return pages.flat()
}

async function fetchProcessAddresses(processIds: string[]) {
  const uniqueProcessIds = Array.from(new Set(processIds.filter(Boolean)))
  if (uniqueProcessIds.length === 0) return new Map<string, GenericRow[]>()

  const chunks = chunkValues(uniqueProcessIds, 120)
  const pages = await Promise.all(
    chunks.map((ids, index) =>
      fetchIndirizzi({
        select: [...ADDRESS_BOARD_SELECT_FIELDS],
        limit: Math.max(ids.length * 3, ids.length),
        offset: 0,
        orderBy: [{ field: "aggiornato_il", ascending: false }],
        filters: {
          kind: "group",
          id: `indirizzi-processi-matching-chunk-${index}`,
          logic: "and",
          nodes: [
            {
              kind: "condition",
              id: `indirizzi-entita-tabella-${index}`,
              field: "entita_tabella",
              operator: "is",
              value: "processi_matching",
            },
            {
              kind: "condition",
              id: `indirizzi-entita-id-${index}`,
              field: "entita_id",
              operator: "in",
              value: ids.join(","),
            },
            {
              kind: "condition",
              id: `indirizzi-tipo-${index}`,
              field: "tipo_indirizzo",
              operator: "in",
              value: "luogo,prova",
            },
          ],
        },
      }).then((result) => asRowArray(result.rows))
    )
  )

  const rows = pages.flat()
  const addressesByProcessId = new Map<string, GenericRow[]>()
  for (const row of rows) {
    const entityId = toStringValue(row.entita_id)
    if (!entityId) continue
    const current = addressesByProcessId.get(entityId) ?? []
    current.push(row)
    addressesByProcessId.set(entityId, current)
  }

  return addressesByProcessId
}

function resolveProcessAddress(
  processId: string,
  addressesByProcessId: Map<string, GenericRow[]>
) {
  const addresses = addressesByProcessId.get(processId) ?? []
  if (addresses.length === 0) return undefined

  return (
    addresses.find(
      (address) => normalizeLookupToken(toStringValue(address.tipo_indirizzo)) === "luogo"
    ) ??
    addresses.find(
      (address) => normalizeLookupToken(toStringValue(address.tipo_indirizzo)) === "prova"
    ) ??
    addresses[0]
  )
}

async function buildCardsForProcesses(
  processRows: GenericRow[],
  lookupRows: LookupValueRecord[]
) {
  const familyIds = processRows
    .map((process) => toStringValue(process.famiglia_id))
    .filter((value): value is string => Boolean(value))
  const processIds = processRows
    .map((process) => toStringValue(process.id))
    .filter((value): value is string => Boolean(value))

  const [familyRows, addressesByProcessId] = await Promise.all([
    fetchFamiliesByIds(familyIds),
    fetchProcessAddresses(processIds),
  ])

  const lookupColors = buildLookupColorMap(lookupRows)
  const stageMetadata = buildStageMetadata(lookupRows)
  const familyById = new Map<string, GenericRow>()
  const cardsByStageId = new Map<string, RicercaBoardCardData[]>()

  for (const family of familyRows) {
    const id = toStringValue(family.id)
    if (!id) continue
    familyById.set(id, family)
  }

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
    const processAddress = resolveProcessAddress(id, addressesByProcessId)

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
      deadline: formatItalianDate(process.deadline_mobile),
      deadlineRaw: toStringValue(process.deadline_mobile),
      zona: formatZonaFromAddress(processAddress) ?? formatLegacyZona(process),
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

    const stageCards = cardsByStageId.get(stage) ?? []
    stageCards.push(card)
    cardsByStageId.set(stage, stageCards)
  }

  return cardsByStageId
}

async function fetchRicercaBoardData(): Promise<RicercaBoardColumnData[]> {
  const lookupResult = await fetchLookupValues()
  const lookupRows = lookupResult.rows
  const stageMetadata = buildStageMetadata(lookupRows)

  const visibleStageNames = new Set(VISIBLE_STAGE_ORDER.map(normalizeStageName))
  const visibleStageDefinitions = stageMetadata.definitions.filter(
    (stage) =>
      visibleStageNames.has(normalizeStageName(stage.label)) ||
      visibleStageNames.has(normalizeStageName(stage.id))
  )

  const eagerStages = visibleStageDefinitions.filter(
    (stage) => !isDeferredStage(stage.label) && !isDeferredStage(stage.id)
  )
  const deferredStages = visibleStageDefinitions.filter(
    (stage) => isDeferredStage(stage.label) || isDeferredStage(stage.id)
  )

  const [eagerProcessRows, deferredCounts] = await Promise.all([
    fetchProcessRowsForStages(eagerStages),
    Promise.all(
      deferredStages.map(async (stage) => [stage.id, await fetchStageCount(stage)] as const)
    ),
  ])

  const eagerCardsByStageId = await buildCardsForProcesses(eagerProcessRows, lookupRows)
  const deferredCountMap = new Map<string, number>(deferredCounts)

  const orderedColumns = [
    ...visibleStageDefinitions.map((stage) => ({
      id: stage.id,
      label: stage.label,
      color: stage.color,
      totalCount: deferredCountMap.get(stage.id) ?? (eagerCardsByStageId.get(stage.id)?.length ?? 0),
      deferred: isDeferredStage(stage.label) || isDeferredStage(stage.id),
      isLoaded: !(isDeferredStage(stage.label) || isDeferredStage(stage.id)),
      isLoading: false,
      cards: eagerCardsByStageId.get(stage.id) ?? [],
    })),
  ]

  const sortOrder = new Map(
    VISIBLE_STAGE_ORDER.map((stage, index) => [normalizeStageName(stage), index])
  )

  orderedColumns.sort((left, right) => {
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

  return orderedColumns
}

export function useRicercaBoard(): UseRicercaBoardState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [columns, setColumns] = React.useState<RicercaBoardColumnData[]>([])

  const loadDeferredColumn = React.useCallback(async (columnId: string) => {
    const targetColumn = columns.find((column) => column.id === columnId)
    if (!targetColumn || !targetColumn.deferred || targetColumn.isLoaded || targetColumn.isLoading) {
      return
    }

    setColumns((current) =>
      current.map((column) =>
        column.id === columnId ? { ...column, isLoading: true } : column
      )
    )

    try {
      const processRows = await fetchProcessRowsForStages([
        { id: targetColumn.id, label: targetColumn.label },
      ])
      const lookupRows = (await fetchLookupValues()).rows
      const cardsByStageId = await buildCardsForProcesses(processRows, lookupRows)
      const loadedCards = cardsByStageId.get(columnId) ?? []

      setColumns((current) =>
        current.map((column) =>
          column.id === columnId
            ? {
                ...column,
                cards: loadedCards,
                totalCount: Math.max(column.totalCount, loadedCards.length),
                isLoaded: true,
                isLoading: false,
              }
            : column
        )
      )
    } catch (caughtError) {
      setColumns((current) =>
        current.map((column) =>
          column.id === columnId ? { ...column, isLoading: false } : column
        )
      )
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Errore caricando colonna differita"
      )
    }
  }, [columns])

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
            return {
              ...column,
              cards: remainingCards,
              totalCount: Math.max(0, column.totalCount - 1),
            }
          }

          return column
        })

        if (!movedCard) return current

        return nextColumns.map((column) =>
          column.id === targetStageId
            ? {
                ...column,
                cards: [movedCard as RicercaBoardCardData, ...column.cards],
                totalCount: column.totalCount + 1,
              }
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
    loadDeferredColumn,
  }
}
