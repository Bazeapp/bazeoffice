import * as React from "react"

import { SectionHeader } from "@/components/shared-next/section-header"
import { StatisticsMetricCard } from "@/components/shared-next/statistics-metric-card"
import { SearchInput } from "@/components/ui/search-input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

import { useCedoliniBoardSelection } from "../hooks/use-cedolini-board-selection"
import { usePayrollBoard } from "../hooks/use-payroll-board"
import {
  buildPayrollMetrics,
  createDefaultCedoliniFilters,
  filterCedoliniColumns,
  getCurrentMonthValue,
  TERMINAL_STAGE_IDS,
  toggleCedoliniFilter,
  type CedoliniFilterGroupKey,
  type CedoliniFilters,
} from "../lib"
import { CedolinoDetailSheet } from "./payroll-overview-cedolino-detail-sheet"
import { useCommentRouteContext } from "@/modules/commenti/hooks"
import {
  cedolinoCommentRow,
  cedolinoDisplayNames,
} from "@/modules/commenti/lib/comment-route-helpers"
import { PayrollOverviewBoardColumn } from "./payroll-overview-board-column"
import {
  PayrollOverviewBoardSkeletonColumn,
} from "./payroll-overview-board-skeleton"
import { PayrollOverviewCedoliniFilterBar } from "./payroll-overview-cedolini-filter-bar"
import { PayrollOverviewCedoliniMonthSwitcher } from "./payroll-overview-cedolini-month-switcher"

export function PayrollOverviewCedoliniView() {
  const [selectedMonth, setSelectedMonth] = React.useState(getCurrentMonthValue)
  const {
    loading,
    error,
    columns,
    moveCard,
    patchCard,
    patchPresence,
    enrichCardFromDetail,
    detailRefreshTick,
  } = usePayrollBoard(selectedMonth)
  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [searchValue, setSearchValue] = React.useState("")
  const [filters, setFilters] = React.useState<CedoliniFilters>(createDefaultCedoliniFilters)

  const selection = useCedoliniBoardSelection({
    columns,
    enrichCardFromDetail,
    detailRefreshTick,
  })

  const toggleFilter = React.useCallback((group: CedoliniFilterGroupKey, value: string) => {
    setFilters((current) => toggleCedoliniFilter(current, group, value))
  }, [])

  const filteredColumns = React.useMemo(
    () => filterCedoliniColumns(columns, filters, searchValue),
    [columns, searchValue, filters],
  )

  const payrollMetrics = React.useMemo(
    () => buildPayrollMetrics(filteredColumns),
    [filteredColumns],
  )
  const metricGroups = [
    payrollMetrics.slice(0, 2),
    payrollMetrics.slice(2, 5),
    payrollMetrics.slice(5),
  ]

  const totalCedolini = React.useMemo(
    () => filteredColumns.reduce((sum, column) => sum + column.cards.length, 0),
    [filteredColumns],
  )

  const commentAnchorRef = React.useRef<HTMLDivElement>(null)
  const selectedCard = selection.selectedCard

  useCommentRouteContext({
    enabled: Boolean(selection.selectedCardId && selectedCard),
    pageFocus:
      selection.selectedCardId && selectedCard
        ? { entityType: "cedolino", entityId: selection.selectedCardId }
        : null,
    row: selectedCard ? cedolinoCommentRow(selectedCard) : {},
    sourceInterface: "cedolini",
    anchorRef: commentAnchorRef,
    displayNames: selectedCard ? cedolinoDisplayNames(selectedCard) : undefined,
  })

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <SectionHeader>
        <SectionHeader.Title
          subtitle={`${totalCedolini} ${totalCedolini === 1 ? "cedolino" : "cedolini"}`}
        >
          Cedolini
        </SectionHeader.Title>
        <SectionHeader.Actions>
          <PayrollOverviewCedoliniMonthSwitcher value={selectedMonth} onChange={setSelectedMonth} />
        </SectionHeader.Actions>
        <SectionHeader.Toolbar>
          <SearchInput
            className="md:max-w-sm"
            data-testid="cedolini-search-input"
            placeholder="Cerca per famiglia, lavoratore, email..."
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onClear={() => setSearchValue("")}
          />
          <PayrollOverviewCedoliniFilterBar filters={filters} onToggle={toggleFilter} />
        </SectionHeader.Toolbar>
      </SectionHeader>

      <div className="px-4 pt-4">
        <div className="flex w-full items-stretch gap-3">
          {metricGroups.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              <div
                className={cn(
                  "grid flex-1 items-stretch gap-3",
                  group.length === 2 && "grid-cols-2",
                  group.length === 3 && "grid-cols-3",
                )}
              >
                {group.map((metric) => (
                  <div key={metric.title} className="min-w-0">
                    <StatisticsMetricCard {...metric} density="compact" />
                  </div>
                ))}
              </div>
              {groupIndex < metricGroups.length - 1 ? (
                <Separator orientation="vertical" className="mx-1 h-auto self-stretch" />
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento payroll: {error}
        </div>
      ) : null}

      <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4 [scrollbar-gutter:stable]">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <PayrollOverviewBoardSkeletonColumn key={index} />
              ))
            : filteredColumns.map((column) => (
                <PayrollOverviewBoardColumn
                  key={column.id}
                  column={column}
                  draggingRecordId={draggingRecordId}
                  isDropTarget={dropTargetColumnId === column.id}
                  onOpenCard={selection.openCard}
                  onDragStartCard={setDraggingRecordId}
                  onDragEndCard={() => {
                    window.setTimeout(() => {
                      setDraggingRecordId(null)
                      setDropTargetColumnId(null)
                    }, 0)
                  }}
                  onDragEnterColumn={setDropTargetColumnId}
                  onDragOverColumn={setDropTargetColumnId}
                  onDragLeaveColumn={(event: React.DragEvent<HTMLDivElement>) => {
                    const nextTarget = event.relatedTarget
                    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return
                    setDropTargetColumnId((current) => (current === column.id ? null : current))
                  }}
                  onDropToColumn={(columnId: string, recordId: string | null) => {
                    setDropTargetColumnId(null)
                    setDraggingRecordId(null)
                    if (!recordId) return
                    if (TERMINAL_STAGE_IDS.has(columnId)) return
                    void moveCard(recordId, columnId)
                  }}
                />
              ))}
        </div>
      </div>

      <CedolinoDetailSheet
        key={selection.selectedCardId ?? "__empty__"}
        card={selection.selectedCard}
        columns={columns}
        open={Boolean(selection.selectedCardId)}
        onOpenChange={(open) => {
          if (!open) selection.closeCard()
        }}
        onStageChange={(recordId, targetStageId) => {
          void moveCard(recordId, targetStageId)
        }}
        onPatchCard={(recordId, patch) => {
          void patchCard(recordId, patch)
        }}
        onPatchPresence={(recordId, patch) => {
          void patchPresence(recordId, patch)
        }}
        commentAnchorRef={commentAnchorRef}
      />
    </section>
  )
}
