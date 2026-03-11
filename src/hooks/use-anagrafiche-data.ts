import * as React from "react"
import type { SortingState } from "@tanstack/react-table"

import {
  type TableColumnMeta,
  type QueryFilterGroup,
  fetchFamiglie,
  fetchLookupValues,
  fetchLavoratori,
  fetchProcessiMatching,
} from "@/lib/anagrafiche-api"
import type { LookupValueRecord } from "@/types"

export type AnagraficaRow = Record<string, unknown>
export type LookupColorMap = Record<string, Record<string, string>>
export type LookupOptionsMap = Record<
  string,
  Array<{
    label: string
    value: string
  }>
>
export type AnagraficheTab = "famiglie" | "processi" | "lavoratori"

type UseAnagraficheDataParams = {
  activeTab: AnagraficheTab
  pageIndex: number
  pageSize: number
  searchValue?: string
  filters?: QueryFilterGroup
  sorting?: SortingState
  grouping?: string[]
}

type AnagraficheDataState = {
  workers: AnagraficaRow[]
  families: AnagraficaRow[]
  processes: AnagraficaRow[]
  workersTotal: number
  familiesTotal: number
  processesTotal: number
  workersColumns: TableColumnMeta[]
  familiesColumns: TableColumnMeta[]
  processesColumns: TableColumnMeta[]
  lookupColors: LookupColorMap
  lookupOptions: LookupOptionsMap
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
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

function buildLookupOptionsMap(rows: LookupValueRecord[]): LookupOptionsMap {
  const grouped = rows.reduce<Record<string, LookupValueRecord[]>>((acc, current) => {
    if (!current.is_active) return acc
    const domain = `${current.entity_table}.${current.entity_field}`
    if (!acc[domain]) acc[domain] = []
    acc[domain].push(current)
    return acc
  }, {})

  return Object.entries(grouped).reduce<LookupOptionsMap>((acc, [domain, values]) => {
    const normalized = values
      .slice()
      .sort((a, b) => {
        const aOrder = a.sort_order ?? Number.MAX_SAFE_INTEGER
        const bOrder = b.sort_order ?? Number.MAX_SAFE_INTEGER
        if (aOrder !== bOrder) return aOrder - bOrder
        return a.value_label.localeCompare(b.value_label)
      })
      .map((item) => ({
        label: item.value_label,
        value: item.value_key,
      }))

    acc[domain] = normalized
    return acc
  }, {})
}

function toRows(data: unknown[]): AnagraficaRow[] {
  return data.map((row) =>
    row && typeof row === "object" ? (row as AnagraficaRow) : {}
  )
}

function tabSchemaErrorMessage(tab: AnagraficheTab) {
  if (tab === "lavoratori") {
    return "Schema filtri lavoratori non disponibile (columns vuote da table-query)."
  }
  if (tab === "processi") {
    return "Schema filtri processi non disponibile (columns vuote da table-query)."
  }
  return "Schema filtri famiglie non disponibile (columns vuote da table-query)."
}

async function fetchTabPage(
  activeTab: AnagraficheTab,
  pageIndex: number,
  pageSize: number,
  includeSchema: boolean,
  searchValue?: string,
  filters?: QueryFilterGroup,
  sorting?: SortingState,
  grouping?: string[]
) {
  const offset = Math.max(0, pageIndex) * Math.max(1, pageSize)
  const limit = Math.max(1, pageSize)
  const groupOrderBy = (grouping ?? []).map((field) => ({ field, ascending: true }))
  const sortOrderBy =
    sorting && sorting.length > 0
      ? sorting.map((item) => ({ field: item.id, ascending: !item.desc }))
      : []
  const orderBy = [...groupOrderBy, ...sortOrderBy].filter(
    (item, index, self) =>
      index === self.findIndex((candidate) => candidate.field === item.field)
  )
  const normalizedSearch = (searchValue ?? "").trim()

  if (activeTab === "processi") {
    return fetchProcessiMatching({
      limit,
      offset,
      includeSchema,
      orderBy,
      search: normalizedSearch || undefined,
      filters,
    })
  }

  if (activeTab === "lavoratori") {
    return fetchLavoratori({
      limit,
      offset,
      includeSchema,
      orderBy,
      search: normalizedSearch || undefined,
      filters,
    })
  }

  return fetchFamiglie({
    limit,
    offset,
    includeSchema,
    orderBy,
    search: normalizedSearch || undefined,
    filters,
  })
}

export function useAnagraficheData({
  activeTab,
  pageIndex,
  pageSize,
  searchValue,
  filters,
  sorting,
  grouping,
}: UseAnagraficheDataParams): AnagraficheDataState {
  const [workers, setWorkers] = React.useState<AnagraficaRow[]>([])
  const [families, setFamilies] = React.useState<AnagraficaRow[]>([])
  const [processes, setProcesses] = React.useState<AnagraficaRow[]>([])
  const [workersTotal, setWorkersTotal] = React.useState(0)
  const [familiesTotal, setFamiliesTotal] = React.useState(0)
  const [processesTotal, setProcessesTotal] = React.useState(0)
  const [workersColumns, setWorkersColumns] = React.useState<TableColumnMeta[]>([])
  const [familiesColumns, setFamiliesColumns] = React.useState<TableColumnMeta[]>([])
  const [processesColumns, setProcessesColumns] = React.useState<TableColumnMeta[]>([])
  const [lookupColors, setLookupColors] = React.useState<LookupColorMap>({})
  const [lookupOptions, setLookupOptions] = React.useState<LookupOptionsMap>({})
  const [loadingLookup, setLoadingLookup] = React.useState(true)
  const [loadingTable, setLoadingTable] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [lookupLoaded, setLookupLoaded] = React.useState(false)
  const schemaLoadedByTabRef = React.useRef<Record<AnagraficheTab, boolean>>({
    famiglie: false,
    processi: false,
    lavoratori: false,
  })
  const tableRequestIdRef = React.useRef(0)

  const loadLookupValues = React.useCallback(
    async (force = false) => {
      if (lookupLoaded && !force) return

      setLoadingLookup(true)
      try {
        const lookupResult = await fetchLookupValues()
        setLookupColors(buildLookupColorMap(lookupResult.rows))
        setLookupOptions(buildLookupOptionsMap(lookupResult.rows))
        setLookupLoaded(true)
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore sconosciuto durante il caricamento lookup"
        setError(message)
        setLookupColors({})
        setLookupOptions({})
      } finally {
        setLoadingLookup(false)
      }
    },
    [lookupLoaded]
  )

  const loadActiveTabRows = React.useCallback(async () => {
    const requestId = tableRequestIdRef.current + 1
    tableRequestIdRef.current = requestId
    setLoadingTable(true)
    setError(null)

    try {
      const includeSchema = !schemaLoadedByTabRef.current[activeTab]

      const result = await fetchTabPage(
        activeTab,
        pageIndex,
        pageSize,
        includeSchema,
        searchValue,
        filters,
        sorting,
        grouping
      )
      if (requestId !== tableRequestIdRef.current) return
      if (includeSchema && result.columns.length === 0) {
        throw new Error(tabSchemaErrorMessage(activeTab))
      }
      if (includeSchema && result.columns.length > 0) {
        schemaLoadedByTabRef.current[activeTab] = true
      }

      const rows = toRows(result.rows)
      const total = result.total

      if (activeTab === "processi") {
        setProcesses(rows)
        setProcessesTotal(total)
        setProcessesColumns(result.columns)
        return
      }

      if (activeTab === "lavoratori") {
        setWorkers(rows)
        setWorkersTotal(total)
        setWorkersColumns(result.columns)
        return
      }

      setFamilies(rows)
      setFamiliesTotal(total)
      setFamiliesColumns(result.columns)
    } catch (caughtError) {
      if (requestId !== tableRequestIdRef.current) return

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Errore sconosciuto durante il caricamento dati"
      setError(message)

      if (activeTab === "processi") {
        setProcesses([])
        setProcessesTotal(0)
        setProcessesColumns([])
        return
      }

      if (activeTab === "lavoratori") {
        setWorkers([])
        setWorkersTotal(0)
        setWorkersColumns([])
        return
      }

      setFamilies([])
      setFamiliesTotal(0)
      setFamiliesColumns([])
    } finally {
      if (requestId === tableRequestIdRef.current) {
        setLoadingTable(false)
      }
    }
  }, [
    activeTab,
    pageIndex,
    pageSize,
    searchValue,
    filters,
    sorting,
    grouping,
  ])

  const refresh = React.useCallback(async () => {
    setError(null)
    await Promise.all([loadLookupValues(true), loadActiveTabRows()])
  }, [loadActiveTabRows, loadLookupValues])

  React.useEffect(() => {
    void loadLookupValues()
  }, [loadLookupValues])

  React.useEffect(() => {
    void loadActiveTabRows()
  }, [loadActiveTabRows])

  return {
    workers,
    families,
    processes,
    workersTotal,
    familiesTotal,
    processesTotal,
    workersColumns,
    familiesColumns,
    processesColumns,
    lookupColors,
    lookupOptions,
    loading: loadingLookup || loadingTable,
    error,
    refresh,
  }
}
