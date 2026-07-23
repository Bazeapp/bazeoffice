import * as React from "react"

import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import type { QueryFilterGroup } from "@/lib/table-query"
import { clearReadCaches } from "@/lib/write-tracking"
import type { LavoratoreListItem } from "../components/lavoratore-card"
import { asLavoratoreRecord } from "../lib/base-utils"
import { LAVORATORI_REALTIME_TABLES } from "../lib/list-constants"
import type { GenericRow } from "../types"
import {
  buildRelatedSelectionsMap,
  buildWorkerListItem,
  groupAddressesByWorker,
} from "../lib/worker-list-mapper"
import {
  buildLavoratoriListQueryKey,
  shouldSkipLavoratoriListFetch,
  type DebouncedQuery,
} from "../lib/lavoratori-list-query-key"
import { toRpcOrderBy } from "../lib/sort-utils"
import { fetchLavoratoriBoard } from "../queries/fetch-lavoratori-board"
import type { LavoratoreRecord } from "../types/lavoratore"

type Gate1FilterState = {
  rpcFilters: import("@/lib/table-query").Gate1RpcFilter[] | null
  rpcFilterGroup: import("@/lib/table-query").QueryFilterGroup
}

type Gate2FilterState = {
  rpcFilters: import("@/lib/table-query").Gate1RpcFilter[] | null
  rpcFilterGroup: import("@/lib/table-query").QueryFilterGroup | null
  canUseGate2Rpc: boolean
}

type UseLavoratoriListOptions = {
  applyGate1BaseFilters: boolean
  cercaGateFilters: Gate1FilterState
  debouncedQuery: DebouncedQuery
  forcedWorkerStatus: string | string[] | undefined
  gate1FollowupFilter: string
  gate1ProvinciaFilter: string
  gate1Filters: Gate1FilterState
  gate2Filters: Gate2FilterState
  includeRelatedSelectionDetails: boolean
  initialSelectedWorkerId: string | null
  lookupColorsByDomain: Map<string, string>
  pageIndex: number
  pageSize: number
  /** Refresh the open detail panel after a realtime board reload (Pattern B). */
  reloadOpenDetail?: () => void
  setSelectedWorkerId: React.Dispatch<React.SetStateAction<string | null>>
  setWorkerRows: React.Dispatch<React.SetStateAction<LavoratoreRecord[]>>
  setWorkersTotal: React.Dispatch<React.SetStateAction<number>>
}

export function useLavoratoriList({
  applyGate1BaseFilters,
  cercaGateFilters,
  debouncedQuery,
  forcedWorkerStatus,
  gate1FollowupFilter,
  gate1ProvinciaFilter,
  gate1Filters,
  gate2Filters,
  includeRelatedSelectionDetails,
  initialSelectedWorkerId,
  lookupColorsByDomain,
  pageIndex,
  pageSize,
  reloadOpenDetail,
  setSelectedWorkerId,
  setWorkerRows,
  setWorkersTotal,
}: UseLavoratoriListOptions) {
  const { options: recruiterOptions } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  })

  const [workerRows, setWorkerRowsInternal] = React.useState<LavoratoreRecord[]>([])
  const workerRowsRef = React.useRef<LavoratoreRecord[]>([])
  const [relatedSelectionsByWorkerId, setRelatedSelectionsByWorkerId] = React.useState<
    Map<string, NonNullable<LavoratoreListItem["otherActiveSelections"]>>
  >(new Map())
  const [workerAddressesById, setWorkerAddressesById] = React.useState<
    Map<string, Record<string, unknown>[]>
  >(new Map())
  const [workersTotal, setWorkersTotalInternal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [realtimeTick, setRealtimeTick] = React.useState(0)
  const silentReloadRef = React.useRef(false)
  const requestIdRef = React.useRef(0)
  const lastLoadedListQueryKeyRef = React.useRef<string | null>(null)
  const inFlightListQueryKeyRef = React.useRef<string | null>(null)

  // Derive during render so `loading === false` and `workers` update in the
  // same commit (avoids a frame where loading is done but workers is still []).
  // Memoize so consumers that depend on `workers` identity (selection effects)
  // do not re-run every parent render.
  const workers = React.useMemo(
    () =>
      workerRows.map((row) => ({
        ...buildWorkerListItem(row, lookupColorsByDomain, workerAddressesById),
        otherActiveSelections: relatedSelectionsByWorkerId.get(row.id) ?? null,
      })),
    [lookupColorsByDomain, relatedSelectionsByWorkerId, workerAddressesById, workerRows]
  )

  const recruiterLabelsById = React.useMemo(
    () => new Map(recruiterOptions.map((option) => [option.id, option.label])),
    [recruiterOptions]
  )
  const lookupColorsByDomainRef = React.useRef(lookupColorsByDomain)
  const recruiterLabelsByIdRef = React.useRef(recruiterLabelsById)

  React.useEffect(() => {
    lookupColorsByDomainRef.current = lookupColorsByDomain
  }, [lookupColorsByDomain])

  React.useEffect(() => {
    recruiterLabelsByIdRef.current = recruiterLabelsById
  }, [recruiterLabelsById])

  React.useEffect(() => {
    workerRowsRef.current = workerRows
  }, [workerRows])

  const setWorkersTotalState = React.useCallback(
    (value: React.SetStateAction<number>) => {
      setWorkersTotalInternal(value)
      setWorkersTotal(value)
    },
    [setWorkersTotal]
  )

  const setWorkerRowsState = React.useCallback(
    (value: React.SetStateAction<LavoratoreRecord[]>) => {
      setWorkerRowsInternal(value)
      setWorkerRows(value)
    },
    [setWorkerRows]
  )

  const cercaGateFiltersDep = applyGate1BaseFilters ? null : cercaGateFilters

  React.useEffect(() => {
    async function load() {
      const silent = silentReloadRef.current
      silentReloadRef.current = false

      const queryKey = buildLavoratoriListQueryKey({
        applyGate1BaseFilters,
        debouncedQuery,
        forcedWorkerStatus,
        gate1FollowupFilter,
        gate1ProvinciaFilter,
        includeRelatedSelectionDetails,
        pageIndex,
        pageSize,
      })
      if (shouldSkipLavoratoriListFetch(lastLoadedListQueryKeyRef.current, queryKey, silent)) {
        setLoading(false)
        return
      }
      if (inFlightListQueryKeyRef.current === queryKey) {
        if (!silent) setLoading(true)
        return
      }

      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId

      inFlightListQueryKeyRef.current = queryKey
      if (!silent) setLoading(true)
      if (!silent) setError(null)
      try {
        if (applyGate1BaseFilters) {
          const board = await fetchLavoratoriBoard("gate1", {
            limit: pageSize,
            offset: pageIndex * pageSize,
            search: debouncedQuery.searchValue.trim() || undefined,
            filters:
              gate1Filters.rpcFilters ??
              gate1Filters.rpcFilterGroup,
            orderBy: toRpcOrderBy(debouncedQuery.sorting),
            includeRelated: includeRelatedSelectionDetails,
          })
          if (requestId !== requestIdRef.current) return

          const pageRows = board.rows.map(asLavoratoreRecord)
          setWorkerRowsState(pageRows)
          setWorkerAddressesById(groupAddressesByWorker(board.indirizzi))
          setRelatedSelectionsByWorkerId(
            includeRelatedSelectionDetails
              ? buildRelatedSelectionsMap(
                  board.selezioniCorrelate as GenericRow[],
                  lookupColorsByDomainRef.current,
                  recruiterLabelsByIdRef.current
                )
              : new Map()
          )
          setWorkersTotalState(board.total)
          lastLoadedListQueryKeyRef.current = queryKey
          setSelectedWorkerId((previous) => {
            if (
              previous &&
              (previous === initialSelectedWorkerId ||
                pageRows.some((row) => row.id === previous))
            ) {
              return previous
            }
            return pageRows[0]?.id ?? null
          })
          return
        }

        if (gate2Filters.canUseGate2Rpc) {
          const board = await fetchLavoratoriBoard("gate2", {
            limit: pageSize,
            offset: pageIndex * pageSize,
            search: debouncedQuery.searchValue.trim() || undefined,
            filters:
              gate2Filters.rpcFilters ??
              (gate2Filters.rpcFilterGroup as QueryFilterGroup),
            orderBy: toRpcOrderBy(debouncedQuery.sorting),
            includeRelated: includeRelatedSelectionDetails,
          })
          if (requestId !== requestIdRef.current) return

          const pageRows = board.rows.map(asLavoratoreRecord)
          setWorkerRowsState(pageRows)
          setWorkerAddressesById(groupAddressesByWorker(board.indirizzi))
          setRelatedSelectionsByWorkerId(
            includeRelatedSelectionDetails
              ? buildRelatedSelectionsMap(
                  board.selezioniCorrelate as GenericRow[],
                  lookupColorsByDomainRef.current,
                  recruiterLabelsByIdRef.current
                )
              : new Map()
          )
          setWorkersTotalState(board.total)
          lastLoadedListQueryKeyRef.current = queryKey
          setSelectedWorkerId((previous) => {
            if (
              previous &&
              (previous === initialSelectedWorkerId ||
                pageRows.some((row) => row.id === previous))
            ) {
              return previous
            }
            return pageRows[0]?.id ?? null
          })
          return
        }

        const cercaRpcFilters = cercaGateFiltersDep?.rpcFilters
        const board = await fetchLavoratoriBoard("cerca", {
          limit: pageSize,
          offset: pageIndex * pageSize,
          search: debouncedQuery.searchValue.trim() || undefined,
          filters: cercaRpcFilters ?? debouncedQuery.filters,
          orderBy: toRpcOrderBy(debouncedQuery.sorting),
          includeRelated: includeRelatedSelectionDetails,
        })
        if (requestId !== requestIdRef.current) return

        const pageRows = board.rows.map(asLavoratoreRecord)
        setWorkerRowsState(pageRows)
        setWorkerAddressesById(groupAddressesByWorker(board.indirizzi))
        setRelatedSelectionsByWorkerId(
          includeRelatedSelectionDetails
            ? buildRelatedSelectionsMap(
                board.selezioniCorrelate as GenericRow[],
                lookupColorsByDomainRef.current,
                recruiterLabelsByIdRef.current
              )
            : new Map()
        )
        setWorkersTotalState(board.total)
        lastLoadedListQueryKeyRef.current = queryKey
        setSelectedWorkerId((previous) => {
          if (
            previous &&
            (previous === initialSelectedWorkerId ||
              pageRows.some((row) => row.id === previous))
          ) {
            return previous
          }
          return pageRows[0]?.id ?? null
        })
      } catch (caughtError) {
        if (requestId !== requestIdRef.current) return
        if (!silent) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Errore nel caricamento lavoratori"
          )
          setWorkerRowsState([])
          setWorkerAddressesById(new Map())
          setRelatedSelectionsByWorkerId(new Map())
          setWorkersTotalState(0)
        }
      } finally {
        if (inFlightListQueryKeyRef.current === queryKey) {
          inFlightListQueryKeyRef.current = null
        }
        if (requestId === requestIdRef.current && !silent) setLoading(false)
      }
    }

    void load()
  }, [
    applyGate1BaseFilters,
    // Null on gate boards so comment-panel re-renders cannot retrigger the list
    // effect via an unused cerca filter bundle identity change.
    cercaGateFiltersDep,
    debouncedQuery,
    forcedWorkerStatus,
    gate1Filters,
    gate1FollowupFilter,
    gate1ProvinciaFilter,
    gate2Filters,
    includeRelatedSelectionDetails,
    initialSelectedWorkerId,
    pageIndex,
    pageSize,
    realtimeTick,
    setSelectedWorkerId,
    setWorkerRowsState,
    setWorkersTotalState,
  ])

  const reloadSilently = React.useCallback(() => {
    silentReloadRef.current = true
    clearReadCaches()
    lastLoadedListQueryKeyRef.current = null
    setRealtimeTick((current) => current + 1)
  }, [])

  useRealtimeBoardSync({
    tables: [...LAVORATORI_REALTIME_TABLES],
    reload: reloadSilently,
    reloadOpenDetail,
  })

  return {
    workers,
    workerRows,
    setWorkerRows: setWorkerRowsState,
    workerAddressesById,
    setWorkerAddressesById,
    workersTotal,
    loading,
    error,
    setError,
    workerRowsRef,
  }
}
