import { UsersIcon } from "lucide-react"
import type { Table } from "@tanstack/react-table"

import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import type { FilterField, FilterGroup } from "@/components/data-table/data-table-filters"
import { LavoratoreCard, type LavoratoreListItem } from "@/components/lavoratori/lavoratore-card"
import { SideCardsPanel } from "@/components/shared/side-cards-panel"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type SavedViewSummary = {
  id: string
  name: string
  updatedAt: string
}

type LavoratoriCercaListPanelProps = {
  workers: LavoratoreListItem[]
  workersTotal: number
  selectedWorkerId: string | null
  setSelectedWorkerId: React.Dispatch<React.SetStateAction<string | null>>
  loading: boolean
  error: string | null
  table: Table<any>
  searchValue: string
  setSearchValue: (value: string) => void
  filters: FilterGroup
  setFilters: (filters: FilterGroup) => void
  filterFields: FilterField[]
  savedViews: SavedViewSummary[]
  activeViewId: string | null
  saveCurrentView: (name: string) => void
  applySavedView: (viewId: string) => void
  deleteSavedView: (viewId: string) => void
  applyFilters: () => void
  hasPendingFilters: boolean
  currentPage: number
  pageCount: number
  pageIndex: number
  setPageIndex: React.Dispatch<React.SetStateAction<number>>
}

export function LavoratoriCercaListPanel({
  workers,
  workersTotal,
  selectedWorkerId,
  setSelectedWorkerId,
  loading,
  error,
  table,
  searchValue,
  setSearchValue,
  filters,
  setFilters,
  filterFields,
  savedViews,
  activeViewId,
  saveCurrentView,
  applySavedView,
  deleteSavedView,
  applyFilters,
  hasPendingFilters,
  currentPage,
  pageCount,
  pageIndex,
  setPageIndex,
}: LavoratoriCercaListPanelProps) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <SideCardsPanel
        title="Lavoratori"
        icon={UsersIcon}
        subtitle={
          loading
            ? "Caricamento..."
            : `${workers.length} su ${workersTotal} lavoratori`
        }
        headerClassName="px-5 pb-1"
        contentClassName="space-y-3 px-5 pt-0 pb-3"
        className="h-full gap-2"
      >
        <DataTableToolbar
          table={table}
          searchValue={searchValue}
          onSearchValueChange={setSearchValue}
          filters={filters}
          onFiltersChange={setFilters}
          filterFields={filterFields}
          searchPlaceholder="Cerca lavoratori..."
          groupOptions={[]}
          enableGrouping={false}
          compactControls
          savedViews={savedViews.map((view) => ({
            id: view.id,
            name: view.name,
            updatedAt: view.updatedAt,
          }))}
          activeViewId={activeViewId}
          onSaveCurrentView={saveCurrentView}
          onApplySavedView={applySavedView}
          onDeleteSavedView={deleteSavedView}
          onApplyFilters={applyFilters}
          hasPendingFilters={hasPendingFilters}
        />

        {loading ? (
          <p className="text-muted-foreground py-3 text-sm">
            Caricamento lavoratori...
          </p>
        ) : error ? (
          <p className="py-3 text-sm text-red-600">{error}</p>
        ) : workers.length === 0 ? (
          <p className="text-muted-foreground py-3 text-sm">
            Nessun lavoratore trovato.
          </p>
        ) : (
          <div
            className={
              selectedWorkerId
                ? "space-y-2"
                : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            }
          >
            {workers.map((worker) => (
              <LavoratoreCard
                key={worker.id}
                worker={worker}
                isActive={worker.id === selectedWorkerId}
                onClick={() =>
                  setSelectedWorkerId((previous) =>
                    previous === worker.id ? null : worker.id
                  )
                }
              />
            ))}
          </div>
        )}
      </SideCardsPanel>

      <div className="text-muted-foreground flex items-center justify-between px-1 text-xs">
        <p>
          Pagina {currentPage} di {pageCount} ({workersTotal} record)
        </p>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text="Prec"
                className={
                  pageIndex <= 0 || loading
                    ? "pointer-events-none opacity-50"
                    : undefined
                }
                onClick={(event) => {
                  event.preventDefault()
                  if (pageIndex <= 0 || loading) return
                  setPageIndex((previous) => Math.max(previous - 1, 0))
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                text="Succ"
                className={
                  currentPage >= pageCount || loading
                    ? "pointer-events-none opacity-50"
                    : undefined
                }
                onClick={(event) => {
                  event.preventDefault()
                  if (currentPage >= pageCount || loading) return
                  setPageIndex((previous) => previous + 1)
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
