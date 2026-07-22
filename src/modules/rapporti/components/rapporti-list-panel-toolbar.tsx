import type { Dispatch, SetStateAction } from "react"
import type { Table } from "@tanstack/react-table"

import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import type { FilterField, FilterGroup } from "@/components/data-table/data-table-filters"
import { SearchInput } from "@/components/ui/search-input"

import { RAPPORTI_LIST_PANEL_GROUP_OPTIONS } from "../lib/rapporti-list-panel.constants"
import type { RapportiListItem } from "../lib/list-panel-utils"

export type RapportiListPanelToolbarProps = {
  table: Table<RapportiListItem>
  searchValue: string
  setSearchValue: (value: string) => void
  onToolbarSearchChange: (value: string) => void
  filters: FilterGroup
  setFilters: Dispatch<SetStateAction<FilterGroup>>
  filterFields: FilterField[]
  savedViews: Array<{ id: string; name: string; updatedAt: string }>
  activeViewId: string | null
  onSaveCurrentView: (name: string) => void
  onApplySavedView: (viewId: string) => void
  onDeleteSavedView: (viewId: string) => void
  onApplyFilters: () => void
  hasPendingFilters: boolean
}

export function RapportiListPanelToolbar({
  table,
  searchValue,
  setSearchValue,
  onToolbarSearchChange,
  filters,
  setFilters,
  filterFields,
  savedViews,
  activeViewId,
  onSaveCurrentView,
  onApplySavedView,
  onDeleteSavedView,
  onApplyFilters,
  hasPendingFilters,
}: RapportiListPanelToolbarProps) {
  return (
    <>
      <SearchInput
        data-testid="rapporti-search-input"
        placeholder="Cerca famiglia o lavoratore..."
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        onClear={() => setSearchValue("")}
      />

      <DataTableToolbar
        table={table}
        searchValue={searchValue}
        onSearchValueChange={onToolbarSearchChange}
        filters={filters}
        onFiltersChange={setFilters}
        filterFields={filterFields}
        searchPlaceholder="Cerca famiglia o lavoratore..."
        groupOptions={[...RAPPORTI_LIST_PANEL_GROUP_OPTIONS]}
        compactControls
        savedViews={savedViews}
        activeViewId={activeViewId}
        onSaveCurrentView={onSaveCurrentView}
        onApplySavedView={onApplySavedView}
        onDeleteSavedView={onDeleteSavedView}
        onApplyFilters={onApplyFilters}
        hasPendingFilters={hasPendingFilters}
        showSearch={false}
      />
    </>
  )
}
