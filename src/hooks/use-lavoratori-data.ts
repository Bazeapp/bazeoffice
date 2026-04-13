import * as React from "react"
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import type { FilterField } from "@/components/data-table/data-table-filters"
import type { LavoratoreListItem } from "@/components/lavoratori/lavoratore-card"
import {
  asLavoratoreRecord,
  getAgeFromBirthDate,
  asString,
  asStringArrayFirst,
  normalizeDomesticRoleLabels,
  toListItem,
  toReadableColumnLabel,
} from "@/features/lavoratori/lib/base-utils"
import {
  type LookupOption,
  isBlacklistValue,
  normalizeLookupColors,
  normalizeLookupOptions,
  resolveLookupColor,
} from "@/features/lavoratori/lib/lookup-utils"
import { toWorkerStatusFlags } from "@/features/lavoratori/lib/status-utils"
import { useTableQueryState } from "@/hooks/use-table-query-state"
import {
  type QueryFilterCondition,
  type QueryFilterGroup,
  type TableColumnMeta,
  fetchDocumentiLavoratoriByWorker,
  fetchEsperienzeLavoratoriByWorker,
  fetchLookupValues,
  fetchLavoratori,
  fetchReferenzeLavoratoriByWorker,
} from "@/lib/anagrafiche-api"
import type { DocumentoLavoratoreRecord } from "@/types/entities/documento-lavoratore"
import type { EsperienzaLavoratoreRecord } from "@/types/entities/esperienza-lavoratore"
import type { LavoratoreRecord } from "@/types/entities/lavoratore"
import type { LookupValueRecord } from "@/types/entities/lookup-values"
import type { ReferenzaLavoratoreRecord } from "@/types/entities/referenza-lavoratore"

const DEFAULT_PAGE_SIZE = 50
const SERVER_QUERY_DEBOUNCE_MS = 700
const VIEWS_STORAGE_KEY = "lavoratori.cerca.saved-views"

type UseLavoratoriDataOptions = {
  forcedWorkerStatus?: string
}

function toCanonicalWorkerStatus(value: string) {
  const normalized = value.trim().toLowerCase().replaceAll("_", " ")

  switch (normalized) {
    case "non qualificato":
      return "Non qualificato"
    case "qualificato":
      return "Qualificato"
    case "non idoneo":
      return "Non idoneo"
    case "idoneo":
      return "Idoneo"
    case "certificato":
      return "Certificato"
    default:
      return value.trim()
  }
}

function buildStatusForcedFilter(
  baseFilters: QueryFilterGroup | undefined,
  forcedWorkerStatus: string | undefined
) {
  const normalizedStatus = toCanonicalWorkerStatus(forcedWorkerStatus ?? "")
  if (!normalizedStatus) return baseFilters

  const statusCondition: QueryFilterCondition = {
    kind: "condition",
    id: "forced-stato-lavoratore",
    field: "stato_lavoratore",
    operator: "is",
    value: normalizedStatus,
  }

  if (!baseFilters || !Array.isArray(baseFilters.nodes) || baseFilters.nodes.length === 0) {
    return {
      kind: "group" as const,
      id: "forced-stato-lavoratore-group",
      logic: "and" as const,
      nodes: [statusCondition],
    }
  }

  return {
    kind: "group" as const,
    id: "forced-stato-lavoratore-merge",
    logic: "and" as const,
    nodes: [baseFilters, statusCondition],
  }
}

function buildLookupFilterTypeMap(rows: LookupValueRecord[]) {
  const filterTypeMap = new Map<string, TableColumnMeta["filterType"]>()

  for (const row of rows) {
    if (!row.is_active) continue
    if (row.entity_table !== "lavoratori") continue
    const domain = `${row.entity_table}.${row.entity_field}`
    const metadata = row.metadata
    const filterType =
      metadata && typeof metadata === "object" && "filter_type" in metadata
        ? metadata.filter_type
        : null
    if (filterType === "enum" || filterType === "multi_enum") {
      filterTypeMap.set(domain, filterType)
    }
  }

  return filterTypeMap
}

function buildWorkerListItem(
  row: LavoratoreRecord,
  lookupColorsByDomain: Map<string, string>
): LavoratoreListItem {
  const statusFlags = toWorkerStatusFlags(row.stato_lavoratore)
  const baseItem = toListItem(row, {
    isBlacklisted: isBlacklistValue(row.check_blacklist),
    statusFlags,
  })
  const statoLavoratore = asString(row.stato_lavoratore) || null
  const disponibilita = asString(row.disponibilita) || null
  const disponibilitaToken = (disponibilita ?? "").toLowerCase().replaceAll("_", " ")
  const isDisponibile =
    disponibilitaToken.length === 0
      ? null
      : disponibilitaToken.includes("non disponibile") ||
          disponibilitaToken.includes("non idone")
        ? false
        : disponibilitaToken.includes("disponib")
          ? true
          : null
  const ruoliDomesticiRaw = Array.isArray(row.tipo_lavoro_domestico)
    ? row.tipo_lavoro_domestico
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    : []
  const ruoliDomestici = normalizeDomesticRoleLabels(ruoliDomesticiRaw)
  const tipoRuolo = ruoliDomestici[0] ?? null
  const tipoLavoro = asStringArrayFirst(row.tipo_rapporto_lavorativo) || null
  const eta = getAgeFromBirthDate(row.data_di_nascita)
  const anniEsperienzaColf =
    typeof row.anni_esperienza_colf === "number" && Number.isFinite(row.anni_esperienza_colf)
      ? row.anni_esperienza_colf
      : null
  const anniEsperienzaBabysitter =
    typeof row.anni_esperienza_babysitter === "number" &&
    Number.isFinite(row.anni_esperienza_babysitter)
      ? row.anni_esperienza_babysitter
      : null

  return {
    ...baseItem,
    statoLavoratore,
    statoLavoratoreColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.stato_lavoratore",
      statoLavoratore
    ),
    disponibilita,
    disponibilitaColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.disponibilita",
      disponibilita
    ),
    isDisponibile,
    tipoRuolo,
    tipoRuoloColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.tipo_lavoro_domestico",
      tipoRuolo
    ),
    tipoLavoro,
    tipoLavoroColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.tipo_rapporto_lavorativo",
      tipoLavoro
    ),
    ruoliDomestici,
    eta,
    anniEsperienzaColf,
    anniEsperienzaBabysitter,
  }
}

export function useLavoratoriData(options: UseLavoratoriDataOptions = {}) {
  const { forcedWorkerStatus } = options
  const [workers, setWorkers] = React.useState<LavoratoreListItem[]>([])
  const [workerRows, setWorkerRows] = React.useState<LavoratoreRecord[]>([])
  const [workersTotal, setWorkersTotal] = React.useState(0)
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [workersColumns, setWorkersColumns] = React.useState<TableColumnMeta[]>([])
  const [selectedWorkerExperiences, setSelectedWorkerExperiences] = React.useState<
    EsperienzaLavoratoreRecord[]
  >([])
  const [selectedWorkerDocuments, setSelectedWorkerDocuments] = React.useState<
    DocumentoLavoratoreRecord[]
  >([])
  const [selectedWorkerReferences, setSelectedWorkerReferences] = React.useState<
    ReferenzaLavoratoreRecord[]
  >([])
  const [loadingSelectedWorkerDocuments, setLoadingSelectedWorkerDocuments] =
    React.useState(false)
  const [loadingSelectedWorkerExperiences, setLoadingSelectedWorkerExperiences] =
    React.useState(false)
  const [loadingSelectedWorkerReferences, setLoadingSelectedWorkerReferences] =
    React.useState(false)
  const [lookupOptionsByDomain, setLookupOptionsByDomain] = React.useState<
    Map<string, LookupOption[]>
  >(new Map())
  const [lookupFilterTypeByDomain, setLookupFilterTypeByDomain] = React.useState<
    Map<string, TableColumnMeta["filterType"]>
  >(new Map())
  const [lookupColorsByDomain, setLookupColorsByDomain] = React.useState<Map<string, string>>(
    new Map()
  )
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize] = React.useState(DEFAULT_PAGE_SIZE)
  const requestIdRef = React.useRef(0)
  const {
    searchValue,
    setSearchValue,
    filters,
    setFilters,
    hasPendingFilters,
    applyFilters,
    sorting,
    setSorting,
    grouping,
    setGrouping,
    debouncedQuery,
    savedViews,
    activeViewId,
    saveView,
    applyView,
    deleteView,
  } = useTableQueryState({
    viewsStorageKey: VIEWS_STORAGE_KEY,
    debounceMs: SERVER_QUERY_DEBOUNCE_MS,
  })

  React.useEffect(() => {
    setPageIndex(0)
  }, [filters, searchValue, sorting])

  React.useEffect(() => {
    let isCancelled = false

    async function loadLookupOptions() {
      try {
        const lookup = await fetchLookupValues()
        if (isCancelled) return
        setLookupOptionsByDomain(normalizeLookupOptions(lookup.rows))
        setLookupFilterTypeByDomain(buildLookupFilterTypeMap(lookup.rows))
        setLookupColorsByDomain(normalizeLookupColors(lookup.rows))
      } catch {
        if (isCancelled) return
        setLookupOptionsByDomain(new Map())
        setLookupFilterTypeByDomain(new Map())
        setLookupColorsByDomain(new Map())
      }
    }

    void loadLookupOptions()

    return () => {
      isCancelled = true
    }
  }, [])

  React.useEffect(() => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const sortOrderBy =
          debouncedQuery.sorting.length > 0
            ? debouncedQuery.sorting.map((item) => ({ field: item.id, ascending: !item.desc }))
            : [
                { field: "stato_lavoratore", ascending: true },
                { field: "data_ora_ultima_modifica", ascending: false },
                { field: "creato_il", ascending: false },
              ]
        const result = await fetchLavoratori({
          limit: pageSize,
          offset: pageIndex * pageSize,
          includeSchema: true,
          orderBy: sortOrderBy,
          search: debouncedQuery.searchValue.trim() || undefined,
          searchFields: ["nome", "cognome", "email", "telefono"],
          filters: buildStatusForcedFilter(debouncedQuery.filters, forcedWorkerStatus),
        })
        if (requestId !== requestIdRef.current) return

        if (result.columns.length > 0) {
          setWorkersColumns(result.columns)
        } else {
          setWorkersColumns([])
          setError("Schema filtri lavoratori non disponibile (columns vuote da table-query).")
        }

        const rows = result.rows.map(asLavoratoreRecord)
        setWorkerRows(rows)
        setWorkers(rows.map((row) => buildWorkerListItem(row, lookupColorsByDomain)))
        setWorkersTotal(result.total)
        setSelectedWorkerId((previous) => {
          if (previous && rows.some((row) => row.id === previous)) return previous
          return rows[0]?.id ?? null
        })
      } catch (caughtError) {
        if (requestId !== requestIdRef.current) return
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore nel caricamento lavoratori"
        )
        setWorkers([])
        setWorkerRows([])
        setWorkersTotal(0)
        setWorkersColumns([])
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    }

    void load()
  }, [debouncedQuery, forcedWorkerStatus, lookupColorsByDomain, pageIndex, pageSize])

  const filterFields = React.useMemo<FilterField[]>(() => {
    return workersColumns.map((column) => {
      const domain = `lavoratori.${column.name}`
      const options = lookupOptionsByDomain.get(domain) ?? []
      const resolvedFilterType = lookupFilterTypeByDomain.get(domain) ?? column.filterType
      return {
        label: toReadableColumnLabel(column.name),
        value: column.name,
        type: resolvedFilterType,
        options:
          resolvedFilterType === "enum" || resolvedFilterType === "multi_enum"
            ? options
            : undefined,
      } satisfies FilterField
    })
  }, [lookupFilterTypeByDomain, lookupOptionsByDomain, workersColumns])

  const sortingColumns = React.useMemo<ColumnDef<LavoratoreRecord>[]>(
    () =>
      workersColumns.map((column) => ({
        id: column.name,
        header: toReadableColumnLabel(column.name),
        accessorFn: (row) => row[column.name as keyof LavoratoreRecord],
      })),
    [workersColumns]
  )

  const table = useReactTable({
    data: workerRows,
    columns: sortingColumns,
    state: {
      sorting,
      grouping,
    },
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  })

  React.useEffect(() => {
    setSelectedWorkerId((previous) => {
      if (previous && workers.some((worker) => worker.id === previous)) return previous
      return workers[0]?.id ?? null
    })
  }, [workers])

  React.useEffect(() => {
    let isCancelled = false

    async function loadSelectedWorkerDocuments() {
      if (!selectedWorkerId) {
        setSelectedWorkerDocuments([])
        setLoadingSelectedWorkerDocuments(false)
        return
      }

      setLoadingSelectedWorkerDocuments(true)
      try {
        const result = await fetchDocumentiLavoratoriByWorker(selectedWorkerId)
        if (isCancelled) return
        setSelectedWorkerDocuments(result.rows)
      } catch {
        if (isCancelled) return
        setSelectedWorkerDocuments([])
      } finally {
        if (!isCancelled) {
          setLoadingSelectedWorkerDocuments(false)
        }
      }
    }

    void loadSelectedWorkerDocuments()

    return () => {
      isCancelled = true
    }
  }, [selectedWorkerId])

  React.useEffect(() => {
    let isCancelled = false

    async function loadSelectedWorkerExperiences() {
      if (!selectedWorkerId) {
        setSelectedWorkerExperiences([])
        setLoadingSelectedWorkerExperiences(false)
        return
      }

      setLoadingSelectedWorkerExperiences(true)
      try {
        const result = await fetchEsperienzeLavoratoriByWorker(selectedWorkerId)
        if (isCancelled) return
        setSelectedWorkerExperiences(result.rows)
      } catch {
        if (isCancelled) return
        setSelectedWorkerExperiences([])
      } finally {
        if (!isCancelled) {
          setLoadingSelectedWorkerExperiences(false)
        }
      }
    }

    void loadSelectedWorkerExperiences()

    return () => {
      isCancelled = true
    }
  }, [selectedWorkerId])

  React.useEffect(() => {
    let isCancelled = false

    async function loadSelectedWorkerReferences() {
      if (!selectedWorkerId) {
        setSelectedWorkerReferences([])
        setLoadingSelectedWorkerReferences(false)
        return
      }

      setLoadingSelectedWorkerReferences(true)
      try {
        const result = await fetchReferenzeLavoratoriByWorker(selectedWorkerId)
        if (isCancelled) return
        setSelectedWorkerReferences(result.rows)
      } catch {
        if (isCancelled) return
        setSelectedWorkerReferences([])
      } finally {
        if (!isCancelled) {
          setLoadingSelectedWorkerReferences(false)
        }
      }
    }

    void loadSelectedWorkerReferences()

    return () => {
      isCancelled = true
    }
  }, [selectedWorkerId])

  const saveCurrentView = React.useCallback((name: string) => {
    saveView(name)
  }, [saveView])

  const applySavedView = React.useCallback((id: string) => {
    const view = applyView(id)
    if (!view) return
    setPageIndex(0)
  }, [applyView])

  const deleteSavedView = React.useCallback((id: string) => {
    deleteView(id)
  }, [deleteView])

  const pageCount = Math.max(1, Math.ceil(workersTotal / pageSize))
  const currentPage = pageIndex + 1
  const selectedWorker = React.useMemo(
    () => workers.find((worker) => worker.id === selectedWorkerId) ?? null,
    [selectedWorkerId, workers]
  )
  const selectedWorkerRow = React.useMemo(
    () => workerRows.find((row) => row.id === selectedWorkerId) ?? null,
    [selectedWorkerId, workerRows]
  )

  const applyUpdatedWorkerRow = React.useCallback(
    (nextRow: LavoratoreRecord) => {
      setWorkerRows((current) =>
        current.map((row) => (row.id === nextRow.id ? nextRow : row))
      )
      setWorkers((current) =>
        current.map((worker) =>
          worker.id === nextRow.id
            ? buildWorkerListItem(nextRow, lookupColorsByDomain)
            : worker
        )
      )
    },
    [lookupColorsByDomain]
  )

  const applyUpdatedWorkerExperience = React.useCallback(
    (nextRow: EsperienzaLavoratoreRecord) => {
      setSelectedWorkerExperiences((current) =>
        current.map((row) => (row.id === nextRow.id ? nextRow : row))
      )
    },
    []
  )

  const appendCreatedWorkerExperience = React.useCallback(
    (nextRow: EsperienzaLavoratoreRecord) => {
      setSelectedWorkerExperiences((current) => [nextRow, ...current])
    },
    []
  )

  const applyUpdatedWorkerReference = React.useCallback(
    (nextRow: ReferenzaLavoratoreRecord) => {
      setSelectedWorkerReferences((current) =>
        current.map((row) => (row.id === nextRow.id ? nextRow : row))
      )
    },
    []
  )

  const appendCreatedWorkerReference = React.useCallback(
    (nextRow: ReferenzaLavoratoreRecord) => {
      setSelectedWorkerReferences((current) => [nextRow, ...current])
    },
    []
  )

  const upsertSelectedWorkerDocument = React.useCallback(
    (nextRow: DocumentoLavoratoreRecord) => {
      setSelectedWorkerDocuments((current) => {
        const existingIndex = current.findIndex((row) => row.id === nextRow.id)
        if (existingIndex === -1) {
          return [nextRow, ...current]
        }

        return current.map((row) => (row.id === nextRow.id ? nextRow : row))
      })
    },
    []
  )

  return {
    workers,
    workerRows,
    workersTotal,
    selectedWorkerId,
    setSelectedWorkerId,
    selectedWorker,
    selectedWorkerRow,
    selectedWorkerDocuments,
    loadingSelectedWorkerDocuments,
    selectedWorkerExperiences,
    loadingSelectedWorkerExperiences,
    selectedWorkerReferences,
    loadingSelectedWorkerReferences,
    loading,
    error,
    setError,
    lookupOptionsByDomain,
    lookupFilterTypeByDomain,
    lookupColorsByDomain,
    filterFields,
    table,
    searchValue,
    setSearchValue,
    filters,
    setFilters,
    hasPendingFilters,
    applyFilters,
    savedViews,
    activeViewId,
    saveCurrentView,
    applySavedView,
    deleteSavedView,
    pageIndex,
    setPageIndex,
    pageCount,
    currentPage,
    applyUpdatedWorkerRow,
    applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
    upsertSelectedWorkerDocument,
  }
}
