import * as React from "react"
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import type { FilterField } from "@/components/data-table/data-table-filters"
import { useTableQueryState } from "@/hooks/use-table-query-state"
import { fetchLookupValues } from "@/lib/lookup-values"
import type { TableColumnMeta } from "@/lib/table-query"
import {
  normalizeDomesticRoleDbLabel,
  toReadableColumnLabel,
} from "../lib/base-utils"
import {
  type LookupOption,
  normalizeLookupColors,
  normalizeLookupOptions,
} from "../lib/lookup-utils"
import {
  SERVER_QUERY_DEBOUNCE_MS,
  VIEWS_STORAGE_KEY,
} from "../lib/list-constants"
import { WORKER_SCHEMA_COLUMNS } from "../lib/filter-schema"
import { buildLookupFilterTypeMap } from "../lib/lookup-filter-types"
import { WORKER_SORTABLE_FIELDS } from "../lib/sort-utils"
import type { LavoratoreRecord } from "../types/lavoratore"

type UseLavoratoriFiltersOptions = {
  workerRows: LavoratoreRecord[]
}

export function useLavoratoriFilters({ workerRows }: UseLavoratoriFiltersOptions) {
  const [workersColumns] = React.useState<TableColumnMeta[]>(WORKER_SCHEMA_COLUMNS)
  const [lookupOptionsByDomain, setLookupOptionsByDomain] = React.useState<
    Map<string, LookupOption[]>
  >(new Map())
  const [lookupFilterTypeByDomain, setLookupFilterTypeByDomain] = React.useState<
    Map<string, TableColumnMeta["filterType"]>
  >(new Map())
  const [lookupColorsByDomain, setLookupColorsByDomain] = React.useState<
    Map<string, string>
  >(new Map())

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

  const loadWorkersSchema = React.useCallback(() => {}, [])

  React.useEffect(() => {
    let isCancelled = false

    async function loadLookupOptions() {
      try {
        const lookup = await fetchLookupValues()
        const lookupOptions = normalizeLookupOptions(lookup.rows)
        if (isCancelled) return
        setLookupOptionsByDomain(lookupOptions)
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

  const filterFields = React.useMemo<FilterField[]>(() => {
    return workersColumns.map((column) => {
      const domain = `lavoratori.${column.name}`
      const options = lookupOptionsByDomain.get(domain) ?? []
      const resolvedFilterType = lookupFilterTypeByDomain.get(domain) ?? column.filterType
      const filterOptions =
        resolvedFilterType === "enum" || resolvedFilterType === "multi_enum"
          ? options.map((opt) => ({
              value:
                column.name === "tipo_lavoro_domestico"
                  ? normalizeDomesticRoleDbLabel(opt.label)
                  : opt.label,
              label: opt.label,
            }))
          : undefined
      return {
        label: toReadableColumnLabel(column.name),
        value: column.name,
        type: resolvedFilterType,
        options: filterOptions,
      } satisfies FilterField
    })
  }, [lookupFilterTypeByDomain, lookupOptionsByDomain, workersColumns])

  const sortingColumns = React.useMemo<ColumnDef<LavoratoreRecord>[]>(
    () =>
      WORKER_SORTABLE_FIELDS.map((field) => ({
        id: field,
        header: toReadableColumnLabel(field),
        accessorFn: (row) => row[field as keyof LavoratoreRecord],
      })),
    []
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

  const saveCurrentView = React.useCallback(
    (name: string) => {
      saveView(name)
    },
    [saveView]
  )

  const applySavedView = React.useCallback(
    (id: string) => {
      const view = applyView(id)
      if (!view) return false
      return true
    },
    [applyView]
  )

  const deleteSavedView = React.useCallback(
    (id: string) => {
      deleteView(id)
    },
    [deleteView]
  )

  return {
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
    saveCurrentView,
    applySavedView,
    deleteSavedView,
    lookupOptionsByDomain,
    lookupFilterTypeByDomain,
    lookupColorsByDomain,
    filterFields,
    loadWorkersSchema,
    table,
  }
}
