import type { OpenRicercaDetailOptions } from "@/routes/app-routes"

import { useCommentRouteContext } from "@/modules/commenti/hooks"
import {
  lavoratoreCommentRow,
  lavoratoreDisplayName,
} from "@/modules/commenti/lib/comment-route-helpers"
import { useLavoratoriData } from "../hooks/use-lavoratori-data"
import { useLavoratoriCercaDetail } from "../hooks/use-lavoratori-cerca-detail"
import { LavoratoriCercaListPanel } from "./lavoratori-cerca-list-panel"
import { LavoratoriCercaDetailPanel } from "./lavoratori-cerca-detail-panel"

type LavoratoriCercaViewProps = {
  initialSelectedWorkerId?: string | null
  onOpenRicercaDetail?: (processId: string, options?: OpenRicercaDetailOptions) => void
}

export function LavoratoriCercaView({
  initialSelectedWorkerId = null,
  onOpenRicercaDetail,
}: LavoratoriCercaViewProps = {}) {
  const {
    workers,
    workersTotal,
    selectedWorkerId,
    setSelectedWorkerId,
    selectedWorker,
    selectedWorkerRow,
    selectedWorkerAddress,
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
    lookupColorsByDomain,
    filterFields,
    loadWorkersSchema,
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
    setPageIndex,
    pageCount,
    currentPage,
    applyUpdatedWorkerRow,
    applyUpdatedWorkerAddress,
    applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience,
    removeWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
    upsertSelectedWorkerDocument,
    selectedWorkerRelatedSearches,
    reloadSelectedWorkerScheda,
  } = useLavoratoriData({ initialSelectedWorkerId })

  const { detailPanelProps } = useLavoratoriCercaDetail({
    onOpenRicercaDetail,
    selectedWorkerId,
    selectedWorker,
    selectedWorkerRow,
    selectedWorkerAddress,
    selectedWorkerDocuments,
    loadingSelectedWorkerDocuments,
    selectedWorkerExperiences,
    loadingSelectedWorkerExperiences,
    selectedWorkerReferences,
    loadingSelectedWorkerReferences,
    setError,
    lookupOptionsByDomain,
    lookupColorsByDomain,
    applyUpdatedWorkerRow,
    applyUpdatedWorkerAddress,
    applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience,
    removeWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
    upsertSelectedWorkerDocument,
    selectedWorkerRelatedSearches,
    reloadSelectedWorkerScheda,
  })

  const workerName = selectedWorker?.nomeCompleto ?? null

  useCommentRouteContext({
    enabled: Boolean(selectedWorkerId),
    pageFocus: selectedWorkerId
      ? { entityType: "lavoratore", entityId: selectedWorkerId }
      : null,
    row: selectedWorkerId
      ? lavoratoreCommentRow(selectedWorkerId, selectedWorkerRow ?? undefined)
      : {},
    sourceInterface: "cerca_lavoratore",
    displayNames: selectedWorkerId
      ? lavoratoreDisplayName(selectedWorkerId, workerName)
      : undefined,
  })

  return (
    <section
      className={
        selectedWorkerId
          ? "ui grid h-full min-h-0 w-full min-w-0 gap-3 overflow-hidden px-4 pb-2 pt-4 lg:grid-cols-[332px_minmax(0,1fr)]"
          : "ui grid h-full min-h-0 w-full min-w-0 grid-cols-1 gap-3 overflow-hidden px-4 pb-2 pt-4"
      }
    >
      <LavoratoriCercaListPanel
        workers={workers}
        workersTotal={workersTotal}
        selectedWorkerId={selectedWorkerId}
        setSelectedWorkerId={setSelectedWorkerId}
        loading={loading}
        error={error}
        table={table}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        filters={filters}
        setFilters={setFilters}
        filterFields={filterFields}
        savedViews={savedViews}
        activeViewId={activeViewId}
        saveCurrentView={saveCurrentView}
        applySavedView={applySavedView}
        deleteSavedView={deleteSavedView}
        applyFilters={applyFilters}
        hasPendingFilters={hasPendingFilters}
        onRequestSchema={loadWorkersSchema}
        currentPage={currentPage}
        pageCount={pageCount}
        setPageIndex={setPageIndex}
      />

      {selectedWorkerId ? (
        <div className="h-full min-h-0 overflow-hidden">
          <LavoratoriCercaDetailPanel
            {...detailPanelProps}
            onClose={() => setSelectedWorkerId(null)}
          />
        </div>
      ) : null}
    </section>
  )
}
