import * as React from "react"
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import type { FilterField } from "@/components/data-table/data-table-filters"
import { useTableQueryState } from "@/hooks/use-table-query-state"
import { useProvincieNameOptions } from "@/hooks/use-provincie"
import { fetchLookupValues } from "@/lib/lookup-values"
import type { TableColumnMeta } from "@/lib/table-query"

import { toReadableColumnLabel } from "../lib/base-utils"
import { WORKER_SCHEMA_COLUMNS } from "../lib/filter-schema"
import { buildLookupFilterTypeMap } from "../lib/lookup-filter-types"
import {
  type LookupOption,
  normalizeLookupColors,
  normalizeLookupOptions,
} from "@/lib/lookup-utils"
import {
  SERVER_QUERY_DEBOUNCE_MS,
  VIEWS_STORAGE_KEY,
} from "../lib/list-constants"
import { WORKER_SORTABLE_FIELDS } from "../lib/sort-utils"
import { buildWorkerFilterFields } from "../lib/worker-filter-fields"
import type { LavoratoreRecord } from "../types/lavoratore"

type UseLavoratoriFiltersOptions = {
  workerRows: LavoratoreRecord[]
}

export function useLavoratoriFilters({ workerRows }: UseLavoratoriFiltersOptions) {
  const [workersColumns] = React.useState<TableColumnMeta[]>(WORKER_SCHEMA_COLUMNS)
  const provincieOptions = useProvincieNameOptions()
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
    return buildWorkerFilterFields({
      columns: workersColumns,
      lookupFilterTypeByDomain,
      lookupOptionsByDomain,
      provincieOptions,
    })
  }, [lookupFilterTypeByDomain, lookupOptionsByDomain, workersColumns, provincieOptions])

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
