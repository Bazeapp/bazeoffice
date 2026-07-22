import * as React from "react"
import { getCoreRowModel, useReactTable } from "@tanstack/react-table"

import { useTableQueryState } from "@/hooks/use-table-query-state"
import type { RapportoAssunzioneNames } from "@/modules/gestione-contrattuale/types"
import type { RapportoLavorativoRecord } from "@/types"

import {
  RAPPORTI_LIST_PANEL_SEARCH_DEBOUNCE_MS,
  RAPPORTI_LIST_PANEL_TABLE_COLUMNS,
  RAPPORTI_LIST_PANEL_VIEWS_STORAGE_KEY,
} from "../lib/rapporti-list-panel.constants"
import {
  buildRapportiListFilterFields,
  filterVisibleRapportiListItems,
  mapRapportiToListItems,
} from "../lib/rapporti-list-panel.mappers"
import type { RapportoStatusFilter } from "../types"

export type RapportiListPanelProps = {
  rapporti: RapportoLavorativoRecord[]
  totalCount: number
  loading: boolean
  error: string | null
  pageIndex: number
  pageSize: number
  onPageChange: (pageIndex: number) => void
  searchValue: string
  onSearchValueChange: (value: string) => void
  rapportoStatusFilter: RapportoStatusFilter
  onRapportoStatusFilterChange: (value: RapportoStatusFilter) => void
  onRetry: () => void
  selectedRapportoId: string | null
  onSelect: (id: string) => void
  lookupColorsByDomain: Map<string, string>
  assunzioneNamesByRapporto?: Record<string, RapportoAssunzioneNames>
}

export function useRapportiListPanel({
  rapporti,
  totalCount,
  loading,
  error,
  pageIndex,
  pageSize,
  onPageChange,
  searchValue: externalSearchValue,
  onSearchValueChange,
  rapportoStatusFilter,
  onRapportoStatusFilterChange,
  onRetry,
  selectedRapportoId,
  onSelect,
  lookupColorsByDomain,
  assunzioneNamesByRapporto,
}: RapportiListPanelProps) {
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({})
  const initialQuery = React.useMemo(
    () => ({
      grouping: [],
      sorting: [],
    }),
    [],
  )
  const {
    setSearchValue,
    filters,
    setFilters,
    sorting,
    setSorting,
    grouping,
    setGrouping,
    savedViews,
    activeViewId,
    saveView,
    applyView,
    deleteView,
    hasPendingFilters,
    applyFilters,
  } = useTableQueryState({
    viewsStorageKey: RAPPORTI_LIST_PANEL_VIEWS_STORAGE_KEY,
    debounceMs: RAPPORTI_LIST_PANEL_SEARCH_DEBOUNCE_MS,
    initialQuery,
  })
  const [localSearchValue, setLocalSearchValue] = React.useState(externalSearchValue)

  React.useEffect(() => {
    setLocalSearchValue(externalSearchValue)
  }, [externalSearchValue])

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchValue(localSearchValue)
      if (localSearchValue !== externalSearchValue) {
        onSearchValueChange(localSearchValue)
      }
    }, RAPPORTI_LIST_PANEL_SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [externalSearchValue, localSearchValue, onSearchValueChange, setSearchValue])

  const items = React.useMemo(
    () => mapRapportiToListItems(rapporti, assunzioneNamesByRapporto),
    [rapporti, assunzioneNamesByRapporto],
  )

  // TanStack Table intentionally returns function-heavy objects; React Compiler cannot memoize this hook safely.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: items,
    columns: RAPPORTI_LIST_PANEL_TABLE_COLUMNS,
    state: { sorting, grouping },
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    getCoreRowModel: getCoreRowModel(),
  })

  const filterFields = React.useMemo(
    () => buildRapportiListFilterFields(items, rapporti),
    [items, rapporti],
  )

  const visibleItems = React.useMemo(
    () => filterVisibleRapportiListItems(items, filters, filterFields, sorting),
    [filterFields, filters, items, sorting],
  )

  const toggleGroup = React.useCallback((groupKey: string) => {
    setCollapsedGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }))
  }, [])

  const clearStatusFilter = React.useCallback(() => {
    onRapportoStatusFilterChange("all")
  }, [onRapportoStatusFilterChange])

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = pageIndex + 1
  const activeFilterCount = rapportoStatusFilter !== "all" ? 1 : 0

  return {
    toolbar: {
      table,
      searchValue: localSearchValue,
      setSearchValue: setLocalSearchValue,
      onToolbarSearchChange: setSearchValue,
      filters,
      setFilters,
      filterFields,
      savedViews: savedViews.map((view) => ({
        id: view.id,
        name: view.name,
        updatedAt: view.updatedAt,
      })),
      activeViewId,
      onSaveCurrentView: saveView,
      onApplySavedView: applyView,
      onDeleteSavedView: deleteView,
      onApplyFilters: applyFilters,
      hasPendingFilters,
    },
    statusFilter: {
      value: rapportoStatusFilter,
      onChange: onRapportoStatusFilterChange,
      activeFilterCount,
      visibleCount: visibleItems.length,
      totalCount: items.length,
      onClear: clearStatusFilter,
    },
    list: {
      items,
      visibleItems,
      grouping,
      collapsedGroups,
      onToggleGroup: toggleGroup,
      selectedRapportoId,
      onSelect,
      lookupColorsByDomain,
    },
    asyncState: {
      loading,
      error,
      onRetry,
    },
    pagination: {
      currentPage,
      pageCount,
      totalCount,
      loading,
      onPageChange,
    },
  }
}
