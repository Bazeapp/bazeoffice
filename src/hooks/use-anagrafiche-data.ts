import * as React from "react"
import type { SortingState } from "@tanstack/react-table"

import {
  type TableColumnMeta,
  type QueryFilterGroup,
  type TableGroupResult,
  fetchFamiglie,
  fetchLookupValues,
  fetchLavoratori,
  fetchMesiLavorati,
  fetchPagamenti,
  fetchProcessiMatching,
  fetchRapportiLavorativi,
  fetchSelezioniLavoratori,
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
export type LookupFilterTypeMap = Record<string, TableColumnMeta["filterType"]>
export type AnagraficheTab =
  | "famiglie"
  | "processi"
  | "lavoratori"
  | "mesi_lavorati"
  | "pagamenti"
  | "selezioni_lavoratori"
  | "rapporti_lavorativi"
export type AnagraficheGroupResult = TableGroupResult

const cachedColumnsByTab: Record<AnagraficheTab, TableColumnMeta[]> = {
  famiglie: [],
  processi: [],
  lavoratori: [],
  mesi_lavorati: [],
  pagamenti: [],
  selezioni_lavoratori: [],
  rapporti_lavorativi: [],
}

let cachedLookupState:
  | {
      colors: LookupColorMap
      options: LookupOptionsMap
      filterTypes: LookupFilterTypeMap
    }
  | null = null

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
  workedMonths: AnagraficaRow[]
  payments: AnagraficaRow[]
  workerSelections: AnagraficaRow[]
  workRelations: AnagraficaRow[]
  workersTotal: number
  familiesTotal: number
  processesTotal: number
  workedMonthsTotal: number
  paymentsTotal: number
  workerSelectionsTotal: number
  workRelationsTotal: number
  workersColumns: TableColumnMeta[]
  familiesColumns: TableColumnMeta[]
  processesColumns: TableColumnMeta[]
  workedMonthsColumns: TableColumnMeta[]
  paymentsColumns: TableColumnMeta[]
  workerSelectionsColumns: TableColumnMeta[]
  workRelationsColumns: TableColumnMeta[]
  workersGroups: AnagraficheGroupResult[]
  familiesGroups: AnagraficheGroupResult[]
  processesGroups: AnagraficheGroupResult[]
  workedMonthsGroups: AnagraficheGroupResult[]
  paymentsGroups: AnagraficheGroupResult[]
  workerSelectionsGroups: AnagraficheGroupResult[]
  workRelationsGroups: AnagraficheGroupResult[]
  lookupColors: LookupColorMap
  lookupOptions: LookupOptionsMap
  lookupFilterTypes: LookupFilterTypeMap
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  loadGroupRows: (
    group: AnagraficheGroupResult,
    pageIndex: number,
    pageSize: number
  ) => Promise<{ rows: AnagraficaRow[]; total: number }>
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

function buildLookupFilterTypeMap(rows: LookupValueRecord[]): LookupFilterTypeMap {
  return rows.reduce<LookupFilterTypeMap>((acc, current) => {
    if (!current.is_active) return acc
    const metadata = current.metadata
    const filterType =
      metadata && typeof metadata === "object" && "filter_type" in metadata
        ? metadata.filter_type
        : null

    if (filterType === "enum" || filterType === "multi_enum") {
      acc[`${current.entity_table}.${current.entity_field}`] = filterType
    }

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
  return `Schema filtri ${tab.replace(/_/g, " ")} non disponibile (columns vuote da table-query).`
}

function createFilterId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function buildGroupFilter(
  baseFilters: QueryFilterGroup | undefined,
  group: AnagraficheGroupResult
): QueryFilterGroup {
  const groupCondition =
    group.value.trim().length > 0
      ? {
          kind: "condition" as const,
          id: createFilterId("group-filter"),
          field: group.field,
          operator: "is" as const,
          value: group.value,
        }
      : {
          kind: "condition" as const,
          id: createFilterId("group-filter-empty"),
          field: group.field,
          operator: "is_empty" as const,
          value: "",
        }

  if (!baseFilters || !Array.isArray(baseFilters.nodes) || baseFilters.nodes.length === 0) {
    return {
      kind: "group",
      id: createFilterId("group-filter-root"),
      logic: "and",
      nodes: [groupCondition],
    }
  }

  return {
    kind: "group",
    id: createFilterId("group-filter-merge"),
    logic: "and",
    nodes: [baseFilters, groupCondition],
  }
}

function mergeFiltersWithCondition(
  baseFilters: QueryFilterGroup | undefined,
  condition: QueryFilterGroup["nodes"][number]
): QueryFilterGroup {
  if (!baseFilters || !Array.isArray(baseFilters.nodes) || baseFilters.nodes.length === 0) {
    return {
      kind: "group",
      id: createFilterId("search-family-root"),
      logic: "and",
      nodes: [condition],
    }
  }

  return {
    kind: "group",
    id: createFilterId("search-family-merge"),
    logic: "and",
    nodes: [baseFilters, condition],
  }
}

async function buildProcessFamilySearchFilters(
  searchValue: string,
  filters: QueryFilterGroup | undefined
) {
  const familyResult = await fetchFamiglie({
    limit: 500,
    offset: 0,
    select: ["id"],
    search: searchValue,
    searchFields: ["nome", "cognome", "email", "telefono"],
  })
  const familyIds = familyResult.rows
    .map((row) => (typeof row.id === "string" ? row.id : null))
    .filter((id): id is string => Boolean(id))

  if (familyIds.length === 0) {
    return { search: searchValue, filters }
  }

  return {
    search: undefined,
    filters: mergeFiltersWithCondition(filters, {
      kind: "condition",
      id: createFilterId("search-family-process"),
      field: "famiglia_id",
      operator: "in",
      value: familyIds.join(","),
    }),
  }
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
    const processSearch = normalizedSearch
      ? await buildProcessFamilySearchFilters(normalizedSearch, filters)
      : { search: undefined, filters }

    return fetchProcessiMatching({
      limit,
      offset,
      includeSchema,
      orderBy,
      search: processSearch.search,
      filters: processSearch.filters,
      groupBy: grouping && grouping.length > 0 ? grouping : undefined,
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
      groupBy: grouping && grouping.length > 0 ? grouping : undefined,
    })
  }

  if (activeTab === "mesi_lavorati") {
    return fetchMesiLavorati({
      limit,
      offset,
      includeSchema,
      orderBy,
      search: normalizedSearch || undefined,
      filters,
      groupBy: grouping && grouping.length > 0 ? grouping : undefined,
    })
  }

  if (activeTab === "pagamenti") {
    return fetchPagamenti({
      limit,
      offset,
      includeSchema,
      orderBy,
      search: normalizedSearch || undefined,
      filters,
      groupBy: grouping && grouping.length > 0 ? grouping : undefined,
    })
  }

  if (activeTab === "selezioni_lavoratori") {
    return fetchSelezioniLavoratori({
      limit,
      offset,
      includeSchema,
      orderBy,
      search: normalizedSearch || undefined,
      filters,
      groupBy: grouping && grouping.length > 0 ? grouping : undefined,
    })
  }

  if (activeTab === "rapporti_lavorativi") {
    return fetchRapportiLavorativi({
      limit,
      offset,
      includeSchema,
      orderBy,
      search: normalizedSearch || undefined,
      filters,
      groupBy: grouping && grouping.length > 0 ? grouping : undefined,
    })
  }

  return fetchFamiglie({
    limit,
    offset,
    includeSchema,
    orderBy,
    search: normalizedSearch || undefined,
    filters,
    groupBy: grouping && grouping.length > 0 ? grouping : undefined,
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
  const [workedMonths, setWorkedMonths] = React.useState<AnagraficaRow[]>([])
  const [payments, setPayments] = React.useState<AnagraficaRow[]>([])
  const [workerSelections, setWorkerSelections] = React.useState<AnagraficaRow[]>([])
  const [workRelations, setWorkRelations] = React.useState<AnagraficaRow[]>([])
  const [workersTotal, setWorkersTotal] = React.useState(0)
  const [familiesTotal, setFamiliesTotal] = React.useState(0)
  const [processesTotal, setProcessesTotal] = React.useState(0)
  const [workedMonthsTotal, setWorkedMonthsTotal] = React.useState(0)
  const [paymentsTotal, setPaymentsTotal] = React.useState(0)
  const [workerSelectionsTotal, setWorkerSelectionsTotal] = React.useState(0)
  const [workRelationsTotal, setWorkRelationsTotal] = React.useState(0)
  const [workersColumns, setWorkersColumns] = React.useState<TableColumnMeta[]>(
    cachedColumnsByTab.lavoratori
  )
  const [familiesColumns, setFamiliesColumns] = React.useState<TableColumnMeta[]>(
    cachedColumnsByTab.famiglie
  )
  const [processesColumns, setProcessesColumns] = React.useState<TableColumnMeta[]>(
    cachedColumnsByTab.processi
  )
  const [workedMonthsColumns, setWorkedMonthsColumns] = React.useState<TableColumnMeta[]>(
    cachedColumnsByTab.mesi_lavorati
  )
  const [paymentsColumns, setPaymentsColumns] = React.useState<TableColumnMeta[]>(
    cachedColumnsByTab.pagamenti
  )
  const [workerSelectionsColumns, setWorkerSelectionsColumns] = React.useState<TableColumnMeta[]>(
    cachedColumnsByTab.selezioni_lavoratori
  )
  const [workRelationsColumns, setWorkRelationsColumns] = React.useState<TableColumnMeta[]>(
    cachedColumnsByTab.rapporti_lavorativi
  )
  const [workersGroups, setWorkersGroups] = React.useState<AnagraficheGroupResult[]>([])
  const [familiesGroups, setFamiliesGroups] = React.useState<AnagraficheGroupResult[]>([])
  const [processesGroups, setProcessesGroups] = React.useState<AnagraficheGroupResult[]>([])
  const [workedMonthsGroups, setWorkedMonthsGroups] = React.useState<AnagraficheGroupResult[]>([])
  const [paymentsGroups, setPaymentsGroups] = React.useState<AnagraficheGroupResult[]>([])
  const [workerSelectionsGroups, setWorkerSelectionsGroups] = React.useState<AnagraficheGroupResult[]>([])
  const [workRelationsGroups, setWorkRelationsGroups] = React.useState<AnagraficheGroupResult[]>([])
  const [lookupColors, setLookupColors] = React.useState<LookupColorMap>(
    cachedLookupState?.colors ?? {}
  )
  const [lookupOptions, setLookupOptions] = React.useState<LookupOptionsMap>(
    cachedLookupState?.options ?? {}
  )
  const [lookupFilterTypes, setLookupFilterTypes] = React.useState<LookupFilterTypeMap>(
    cachedLookupState?.filterTypes ?? {}
  )
  const [loadingLookup, setLoadingLookup] = React.useState(!cachedLookupState)
  const [loadingTable, setLoadingTable] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [lookupLoaded, setLookupLoaded] = React.useState(Boolean(cachedLookupState))
  const schemaLoadedByTabRef = React.useRef<Record<AnagraficheTab, boolean>>({
    famiglie: cachedColumnsByTab.famiglie.length > 0,
    processi: cachedColumnsByTab.processi.length > 0,
    lavoratori: cachedColumnsByTab.lavoratori.length > 0,
    mesi_lavorati: cachedColumnsByTab.mesi_lavorati.length > 0,
    pagamenti: cachedColumnsByTab.pagamenti.length > 0,
    selezioni_lavoratori: cachedColumnsByTab.selezioni_lavoratori.length > 0,
    rapporti_lavorativi: cachedColumnsByTab.rapporti_lavorativi.length > 0,
  })
  const tableRequestIdRef = React.useRef(0)

  const loadLookupValues = React.useCallback(
    async (force = false) => {
      if (lookupLoaded && !force) return

      setLoadingLookup(true)
      try {
        const lookupResult = await fetchLookupValues()
        const nextLookupState = {
          colors: buildLookupColorMap(lookupResult.rows),
          options: buildLookupOptionsMap(lookupResult.rows),
          filterTypes: buildLookupFilterTypeMap(lookupResult.rows),
        }
        cachedLookupState = nextLookupState
        setLookupColors(nextLookupState.colors)
        setLookupOptions(nextLookupState.options)
        setLookupFilterTypes(nextLookupState.filterTypes)
        setLookupLoaded(true)
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore sconosciuto durante il caricamento lookup"
        setError(message)
        if (!cachedLookupState) {
          setLookupColors({})
          setLookupOptions({})
          setLookupFilterTypes({})
        }
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
      const groups = result.groups ?? []

      const columns = result.columns
      const hasColumns = columns.length > 0

      if (activeTab === "processi") {
        setProcesses(rows)
        setProcessesTotal(total)
        if (hasColumns) {
          cachedColumnsByTab.processi = columns
          setProcessesColumns(columns)
        }
        setProcessesGroups(groups)
      } else if (activeTab === "lavoratori") {
        setWorkers(rows)
        setWorkersTotal(total)
        if (hasColumns) {
          cachedColumnsByTab.lavoratori = columns
          setWorkersColumns(columns)
        }
        setWorkersGroups(groups)
      } else if (activeTab === "mesi_lavorati") {
        setWorkedMonths(rows)
        setWorkedMonthsTotal(total)
        if (hasColumns) {
          cachedColumnsByTab.mesi_lavorati = columns
          setWorkedMonthsColumns(columns)
        }
        setWorkedMonthsGroups(groups)
      } else if (activeTab === "pagamenti") {
        setPayments(rows)
        setPaymentsTotal(total)
        if (hasColumns) {
          cachedColumnsByTab.pagamenti = columns
          setPaymentsColumns(columns)
        }
        setPaymentsGroups(groups)
      } else if (activeTab === "selezioni_lavoratori") {
        setWorkerSelections(rows)
        setWorkerSelectionsTotal(total)
        if (hasColumns) {
          cachedColumnsByTab.selezioni_lavoratori = columns
          setWorkerSelectionsColumns(columns)
        }
        setWorkerSelectionsGroups(groups)
      } else if (activeTab === "rapporti_lavorativi") {
        setWorkRelations(rows)
        setWorkRelationsTotal(total)
        if (hasColumns) {
          cachedColumnsByTab.rapporti_lavorativi = columns
          setWorkRelationsColumns(columns)
        }
        setWorkRelationsGroups(groups)
      } else {
        setFamilies(rows)
        setFamiliesTotal(total)
        if (hasColumns) {
          cachedColumnsByTab.famiglie = columns
          setFamiliesColumns(columns)
        }
        setFamiliesGroups(groups)
      }
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
        setProcessesGroups([])
        return
      }

      if (activeTab === "lavoratori") {
        setWorkers([])
        setWorkersTotal(0)
        setWorkersGroups([])
        return
      }

      if (activeTab === "mesi_lavorati") {
        setWorkedMonths([])
        setWorkedMonthsTotal(0)
        setWorkedMonthsGroups([])
        return
      }

      if (activeTab === "pagamenti") {
        setPayments([])
        setPaymentsTotal(0)
        setPaymentsGroups([])
        return
      }

      if (activeTab === "selezioni_lavoratori") {
        setWorkerSelections([])
        setWorkerSelectionsTotal(0)
        setWorkerSelectionsGroups([])
        return
      }

      if (activeTab === "rapporti_lavorativi") {
        setWorkRelations([])
        setWorkRelationsTotal(0)
        setWorkRelationsGroups([])
        return
      }

      setFamilies([])
      setFamiliesTotal(0)
      setFamiliesGroups([])
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

  const loadGroupRows = React.useCallback(
    async (group: AnagraficheGroupResult, groupPageIndex: number, groupPageSize: number) => {
      const result = await fetchTabPage(
        activeTab,
        groupPageIndex,
        groupPageSize,
        false,
        searchValue,
        buildGroupFilter(filters, group),
        sorting,
        []
      )

      return {
        rows: toRows(result.rows),
        total: result.total,
      }
    },
    [activeTab, filters, searchValue, sorting]
  )

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
    workedMonths,
    payments,
    workerSelections,
    workRelations,
    workersTotal,
    familiesTotal,
    processesTotal,
    workedMonthsTotal,
    paymentsTotal,
    workerSelectionsTotal,
    workRelationsTotal,
    workersColumns,
    familiesColumns,
    processesColumns,
    workedMonthsColumns,
    paymentsColumns,
    workerSelectionsColumns,
    workRelationsColumns,
    workersGroups,
    familiesGroups,
    processesGroups,
    workedMonthsGroups,
    paymentsGroups,
    workerSelectionsGroups,
    workRelationsGroups,
    lookupColors,
    lookupOptions,
    lookupFilterTypes,
    loading: loadingLookup || loadingTable,
    error,
    refresh,
    loadGroupRows,
  }
}
