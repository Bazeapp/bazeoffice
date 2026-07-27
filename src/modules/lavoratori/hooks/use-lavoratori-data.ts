import * as React from "react"

import type { UseLavoratoriDataOptions } from "../types"
import type { LavoratoreRecord } from "../types/lavoratore"
import { useGate1Filters } from "./use-gate1-filters"
import { useGate2Filters } from "./use-gate2-filters"
import { useLavoratoriFilters } from "./use-lavoratori-filters"
import { useLavoratoriList } from "./use-lavoratori-list"
import { useLavoratoriPagination } from "./use-lavoratori-pagination"
import { useSelectedLavoratore } from "./use-selected-lavoratore"
import { useSelectedLavoratoreDetail } from "./use-selected-lavoratore-detail"

export function useLavoratoriData(options: UseLavoratoriDataOptions = {}) {
  const {
    initialSelectedWorkerId = null,
    forcedWorkerStatus,
    applyGate1BaseFilters = false,
    includeRelatedSelectionDetails = true,
    gate1ProvinciaFilter = "all",
    gate1FollowupFilter = "all",
  } = options

  const [workerRows, setWorkerRows] = React.useState<LavoratoreRecord[]>([])
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string | null>(
    initialSelectedWorkerId
  )
  const [workersTotal, setWorkersTotal] = React.useState(0)

  const filters = useLavoratoriFilters({ workerRows })

  const gate1Filters = useGate1Filters({
    filters: filters.debouncedQuery.filters,
    gate1ProvinciaFilter,
    gate1FollowupFilter,
  })

  const cercaGateFilters = useGate1Filters({
    filters: filters.debouncedQuery.filters,
    gate1ProvinciaFilter: "all",
    gate1FollowupFilter: "all",
  })

  const gate2Filters = useGate2Filters({
    applyGate1BaseFilters,
    filters: filters.debouncedQuery.filters,
    forcedWorkerStatus,
    gate1ProvinciaFilter,
    gate1FollowupFilter,
    sorting: filters.debouncedQuery.sorting,
  })

  const pagination = useLavoratoriPagination({
    workersTotal,
    resetPageDeps: [
      filters.debouncedQuery.searchValue,
      filters.filters,
      gate1FollowupFilter,
      gate1ProvinciaFilter,
      filters.sorting,
    ],
  })

  // `detail` is created after `list` (it consumes list outputs), so the
  // realtime detail-refresh callback is threaded through a ref (Pattern B:
  // remote changes must also refresh the open scheda, not just the board).
  const reloadOpenDetailRef = React.useRef<() => void>(() => {})
  const reloadOpenDetail = React.useCallback(() => {
    reloadOpenDetailRef.current()
  }, [])

  const list = useLavoratoriList({
    applyGate1BaseFilters,
    cercaGateFilters,
    debouncedQuery: filters.debouncedQuery,
    forcedWorkerStatus,
    gate1FollowupFilter,
    gate1ProvinciaFilter,
    gate1Filters,
    gate2Filters,
    includeRelatedSelectionDetails,
    initialSelectedWorkerId,
    lookupColorsByDomain: filters.lookupColorsByDomain,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    reloadOpenDetail,
    selectedWorkerId,
    setSelectedWorkerId,
    setWorkerRows,
    setWorkersTotal,
  })

  const detail = useSelectedLavoratoreDetail({
    lookupColorsByDomain: filters.lookupColorsByDomain,
    selectedWorkerId,
    workerAddressesById: list.workerAddressesById,
    workerRows: list.workerRows,
    workerRowsRef: list.workerRowsRef,
    setWorkerAddressesById: list.setWorkerAddressesById,
    setWorkerRows: list.setWorkerRows,
    setWorkers: list.setWorkers,
  })

  React.useEffect(() => {
    reloadOpenDetailRef.current = detail.reloadSelectedWorkerScheda
  }, [detail.reloadSelectedWorkerScheda])

  const selection = useSelectedLavoratore({
    initialSelectedWorkerId,
    selectedWorkerId,
    setSelectedWorkerId,
    selectedWorkerRow: detail.selectedWorkerRow,
    workers: list.workers,
  })

  const applySavedView = React.useCallback(
    (id: string) => {
      const applied = filters.applySavedView(id)
      if (!applied) return
      pagination.setPageIndex(0)
    },
    [filters, pagination]
  )

  return {
    workers: list.workers,
    workerRows: list.workerRows,
    workerAddressesById: list.workerAddressesById,
    workersTotal: list.workersTotal,
    selectedWorkerId: selection.selectedWorkerId,
    setSelectedWorkerId: selection.setSelectedWorkerId,
    selectedWorker: selection.selectedWorker,
    selectedWorkerRow: detail.selectedWorkerRow,
    selectedWorkerAddress: detail.selectedWorkerAddress,
    selectedWorkerDocuments: detail.selectedWorkerDocuments,
    loadingSelectedWorkerDocuments: detail.loadingSelectedWorkerDocuments,
    selectedWorkerExperiences: detail.selectedWorkerExperiences,
    loadingSelectedWorkerExperiences: detail.loadingSelectedWorkerExperiences,
    selectedWorkerReferences: detail.selectedWorkerReferences,
    loadingSelectedWorkerReferences: detail.loadingSelectedWorkerReferences,
    selectedWorkerRelatedSearches: detail.selectedWorkerRelatedSearches,
    reloadSelectedWorkerScheda: detail.reloadSelectedWorkerScheda,
    loading: list.loading,
    error: list.error,
    setError: list.setError,
    lookupOptionsByDomain: filters.lookupOptionsByDomain,
    lookupFilterTypeByDomain: filters.lookupFilterTypeByDomain,
    lookupColorsByDomain: filters.lookupColorsByDomain,
    filterFields: filters.filterFields,
    loadWorkersSchema: filters.loadWorkersSchema,
    table: filters.table,
    searchValue: filters.searchValue,
    setSearchValue: filters.setSearchValue,
    filters: filters.filters,
    setFilters: filters.setFilters,
    hasPendingFilters: filters.hasPendingFilters,
    applyFilters: filters.applyFilters,
    savedViews: filters.savedViews,
    activeViewId: filters.activeViewId,
    saveCurrentView: filters.saveCurrentView,
    applySavedView,
    deleteSavedView: filters.deleteSavedView,
    pageIndex: pagination.pageIndex,
    setPageIndex: pagination.setPageIndex,
    pageCount: pagination.pageCount,
    currentPage: pagination.currentPage,
    applyUpdatedWorkerRow: detail.applyUpdatedWorkerRow,
    applyUpdatedWorkerAddress: detail.applyUpdatedWorkerAddress,
    applyUpdatedWorkerExperience: detail.applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience: detail.appendCreatedWorkerExperience,
    removeWorkerExperience: detail.removeWorkerExperience,
    applyUpdatedWorkerReference: detail.applyUpdatedWorkerReference,
    appendCreatedWorkerReference: detail.appendCreatedWorkerReference,
    upsertSelectedWorkerDocument: detail.upsertSelectedWorkerDocument,
  }
}
