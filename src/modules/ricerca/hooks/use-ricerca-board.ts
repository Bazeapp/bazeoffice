import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { useMoveMutation } from "@/hooks/use-board-mutations"

import { applyOptimisticCardMove } from "@/lib/board-column-utils"
import { buildStageMetadataFromLookupRows } from "@/lib/lookup-stage-metadata"
import { fetchLookupValues } from "@/lib/lookup-values"
import { updateRecord } from "@/lib/record-crud"
import {
  formatItalianDate,
  getFirstArrayValue,
  getStringArrayValue,
  normalizeLookupToken,
  readLookupColor,
  toStringValue,
} from "@/lib/value-utils"
import { fetchRicercaBoard } from "../queries/fetch-ricerca-board"
import type { RicercaBoardRpcProcess } from "../types/ricerca-rpc"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import { STATI_RICERCA_CANONICI } from "../lib/stati-ricerca"

const RICERCA_REALTIME_TABLES = [
  "processi_matching",
  "famiglie",
  "indirizzi",
]
import type { LookupValueRecord } from "@/types"

import type { RicercaBoardCardData, RicercaBoardColumnData } from "../types"
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

type UseRicercaBoardState = {
  loading: boolean
  error: string | null
  columns: RicercaBoardColumnData[]
  moveCard: (processId: string, targetStageId: string) => Promise<void>
  loadDeferredColumn: (columnId: string) => Promise<void>
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
  const fromLookup = buildStageMetadataFromLookupRows({
    lookupRows: rows,
    entityTable: "processi_matching",
    entityField: "stato_res",
  })

  const definitionsById = new Map(fromLookup.definitions.map((stage) => [stage.id, stage]))
  const aliases = new Map(fromLookup.aliases)

  for (const stage of STATI_RICERCA_CANONICI) {
    const existing = definitionsById.get(stage.id)
    definitionsById.set(stage.id, {
      id: stage.id,
      label: stage.label,
      color: existing?.color ?? stage.color,
    })
    aliases.set(normalizeLookupToken(stage.id), stage.id)
    aliases.set(normalizeLookupToken(stage.label), stage.id)
  }

  return {
    definitions: STATI_RICERCA_CANONICI.flatMap((stage) => {
      const definition = definitionsById.get(stage.id)
      return definition ? [definition] : []
    }),
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

  const note = toStringValue(address.note)
  return note?.split("-")[0]?.trim() || null
}

async function buildCardsForProcesses(
  processRows: RicercaBoardRpcProcess[],
  lookupRows: LookupValueRecord[]
) {
  const lookupColors = buildLookupColorMap(lookupRows)
  const stageMetadata = buildStageMetadata(lookupRows)
  const cardsByStageId = new Map<string, RicercaBoardCardData[]>()

  for (const process of processRows) {
    const id = toStringValue(process.id)
    const stageRaw = toStringValue(process.stato_res)
    const famigliaId = toStringValue(process.famiglia_id)
    if (!id || !stageRaw || !famigliaId) continue

    const stage =
      stageMetadata.aliases.get(normalizeLookupToken(stageRaw)) ?? stageRaw

    const family = process.famiglia
    if (!family) continue

    const cognomeFamiglia = toStringValue(family.cognome) ?? ""
    const nomeFamiglia = [toStringValue(family.nome), cognomeFamiglia]
      .filter((value): value is string => Boolean(value))
      .join(" ")

    const tipoLavoroBadges = getStringArrayValue(process.tipo_lavoro)
    const tipoLavoroBadge = tipoLavoroBadges[0] ?? null
    const tipoRapportoBadge = getFirstArrayValue(process.tipo_rapporto)
    const processAddress = (process.indirizzo as GenericRow | null) ?? undefined

    const card: RicercaBoardCardData = {
      id,
      stage,
      nomeFamiglia: nomeFamiglia || "-",
      cognomeFamiglia,
      email: toStringValue(family.email) ?? "-",
      telefono: toStringValue(family.telefono) ?? "-",
      operatorId: toStringValue(process.recruiter_ricerca_e_selezione_id),
      oreSettimanali: toStringValue(process.ore_settimanale) ?? "-",
      giorniSettimanali: toStringValue(process.numero_giorni_settimanali) ?? "-",
      deadline: formatItalianDate(process.deadline_mobile),
      deadlineRaw: toStringValue(process.deadline_mobile),
      zona: formatZonaFromAddress(processAddress) ?? "-",
      tipoLavoroBadges,
      tipoLavoroColors: Object.fromEntries(
        tipoLavoroBadges.map((tipoLavoro) => [
          tipoLavoro,
          resolveBadgeColor(
            lookupColors,
            "processi_matching",
            "tipo_lavoro",
            tipoLavoro
          ),
        ])
      ),
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

  const visibleStageDefinitions = stageMetadata.definitions

  const eagerStages = visibleStageDefinitions.filter(
    (stage) => !isDeferredStage(stage.label) && !isDeferredStage(stage.id)
  )
  const deferredStages = visibleStageDefinitions.filter(
    (stage) => isDeferredStage(stage.label) || isDeferredStage(stage.id)
  )

  const eagerStageValues = Array.from(
    new Set(eagerStages.flatMap((stage) => [stage.id, stage.label]).filter(Boolean))
  ) as string[]
  const deferredStageValues = Array.from(
    new Set(deferredStages.flatMap((stage) => [stage.id, stage.label]).filter(Boolean))
  ) as string[]

  const boardResult = await fetchRicercaBoard(eagerStageValues, deferredStageValues)
  const eagerCardsByStageId = await buildCardsForProcesses(boardResult.processes, lookupRows)
  const deferredCountMap = new Map<string, number>()
  for (const stage of deferredStages) {
    const count =
      (boardResult.deferredCounts[stage.id] as number | undefined) ??
      (boardResult.deferredCounts[stage.label] as number | undefined) ??
      0
    deferredCountMap.set(stage.id, count)
  }

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
    STATI_RICERCA_CANONICI.flatMap((stage, index) => [
      [normalizeStageName(stage.id), index] as const,
      [normalizeStageName(stage.label), index] as const,
    ])
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

const RICERCA_BOARD_QUERY_KEY = ["ricerca-board"] as const

export function useRicercaBoard(): UseRicercaBoardState {
  const queryClient = useQueryClient()
  // IMPORTANT: ref (not state) so the queryFn closure always sees the
  // latest set. On refetch (e.g. realtime invalidate) the base call
  // returns deferred columns as empty + isLoaded:false, so we re-fetch
  // any column the user had already opted into to avoid the cards
  // "disappearing" right after Carica processi.
  const loadedDeferredColumnIdsRef = React.useRef<Set<string>>(new Set())

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: RICERCA_BOARD_QUERY_KEY,
    queryFn: async () => {
      const baseColumns = await fetchRicercaBoardData()
      const loaded = loadedDeferredColumnIdsRef.current
      if (loaded.size === 0) return baseColumns

      const lookupRowsPromise = fetchLookupValues().then((result) => result.rows)
      const overrides = new Map<string, RicercaBoardCardData[]>()

      await Promise.all(
        Array.from(loaded).map(async (columnId) => {
          const target = baseColumns.find((column) => column.id === columnId)
          if (!target) return
          const eagerValues = Array.from(
            new Set([target.id, target.label].filter(Boolean))
          ) as string[]
          const [boardResult, lookupRows] = await Promise.all([
            fetchRicercaBoard(eagerValues, []),
            lookupRowsPromise,
          ])
          const cardsByStageId = await buildCardsForProcesses(boardResult.processes, lookupRows)
          overrides.set(columnId, cardsByStageId.get(columnId) ?? [])
        }),
      )

      return baseColumns.map((column) => {
        if (!overrides.has(column.id)) return column
        const cards = overrides.get(column.id) ?? []
        return {
          ...column,
          cards,
          totalCount: Math.max(column.totalCount, cards.length),
          isLoaded: true,
          isLoading: false,
        }
      })
    },
  })

  const columns = data ?? []

  const { setBoardData, invalidateBoard } = useBoardQueryCache<RicercaBoardColumnData[]>(
    RICERCA_BOARD_QUERY_KEY,
  )

  const loadDeferredColumn = React.useCallback(async (columnId: string) => {
    const currentColumns = queryClient.getQueryData<RicercaBoardColumnData[]>(RICERCA_BOARD_QUERY_KEY) ?? []
    const targetColumn = currentColumns.find((column) => column.id === columnId)
    if (!targetColumn || !targetColumn.deferred || targetColumn.isLoaded || targetColumn.isLoading) {
      return
    }

    setBoardData((previous) =>
      (previous ?? []).map((column) =>
        column.id === columnId ? { ...column, isLoading: true } : column,
      ),
    )

    try {
      const eagerValues = Array.from(
        new Set([targetColumn.id, targetColumn.label].filter(Boolean))
      ) as string[]
      const [boardResult, lookupResultRows] = await Promise.all([
        fetchRicercaBoard(eagerValues, []),
        fetchLookupValues().then((result) => result.rows),
      ])
      const cardsByStageId = await buildCardsForProcesses(boardResult.processes, lookupResultRows)
      const loadedCards = cardsByStageId.get(columnId) ?? []

      // Record opt-in before mutating cache so any concurrent refetch
      // (realtime) sees this column as user-loaded.
      loadedDeferredColumnIdsRef.current = new Set([
        ...loadedDeferredColumnIdsRef.current,
        columnId,
      ])
      setBoardData((previous) =>
        (previous ?? []).map((column) =>
          column.id === columnId
            ? {
                ...column,
                cards: loadedCards,
                totalCount: Math.max(column.totalCount, loadedCards.length),
                isLoaded: true,
                isLoading: false,
              }
            : column,
        ),
      )
    } catch {
      setBoardData((previous) =>
        (previous ?? []).map((column) =>
          column.id === columnId ? { ...column, isLoading: false } : column,
        ),
      )
    }
  }, [queryClient, setBoardData])

  const moveMutation = useMoveMutation<
    { processId: string; targetStageId: string },
    unknown,
    RicercaBoardColumnData[]
  >({
    queryKey: RICERCA_BOARD_QUERY_KEY,
    mutationFn: ({ processId, targetStageId }) =>
      updateRecord("processi_matching", processId, { stato_res: targetStageId }),
    applyOptimistic: (previous, { processId, targetStageId }) => {
      if (!previous) return previous

      let sourceColumnId: string | null = null
      for (const column of previous) {
        if (column.cards.some((card) => card.id === processId)) {
          sourceColumnId = column.id
          break
        }
      }

      const movedColumns = applyOptimisticCardMove(previous, processId, targetStageId) as
        | RicercaBoardColumnData[]
        | undefined
      if (!movedColumns) return previous

      return movedColumns.map((column) => {
        if (column.id === sourceColumnId && sourceColumnId !== targetStageId) {
          return { ...column, totalCount: Math.max(0, column.totalCount - 1) }
        }
        if (column.id === targetStageId && sourceColumnId !== targetStageId) {
          return { ...column, totalCount: column.totalCount + 1 }
        }
        return column
      })
    },
  })

  const moveCard = React.useCallback(
    async (processId: string, targetStageId: string) => {
      await moveMutation.mutateAsync({ processId, targetStageId })
    },
    [moveMutation],
  )

  useRealtimeBoardSync({
    tables: RICERCA_REALTIME_TABLES,
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
    loadDeferredColumn,
  }
}
