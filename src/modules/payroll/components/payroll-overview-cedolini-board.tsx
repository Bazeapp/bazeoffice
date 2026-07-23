import * as React from "react"

import { StatisticsMetricCard } from "@/components/shared-next/statistics-metric-card"
import { Separator } from "@/components/ui/separator"
import type { MeseLavoratoRecord, PresenzaMensileRecord } from "@/types"

import { TERMINAL_STAGE_IDS, type PayrollMetric } from "../lib"
import type { PayrollBoardCardData, PayrollBoardColumnData } from "../types"
import { CedolinoDetailSheet } from "./payroll-overview-cedolino-detail-sheet"
import { PayrollOverviewBoardColumn } from "./payroll-overview-board-column"
import { PayrollOverviewBoardSkeletonColumn } from "./payroll-overview-board-skeleton"

/**
 * Board-only body of `PayrollOverviewCedoliniView` (metrics + kanban + detail
 * sheet), extracted so it can be conditionally rendered alongside the
 * Controlli / Pagamenti modes without touching its DnD/filters/detail-sheet
 * behavior (plan U4 point 6). All state (filters, search, selection, drag)
 * still lives in the parent, which passes its `useState` setters straight
 * through — this component is purely presentational and behavior-identical
 * to the pre-U4 inline JSX.
 */
export type PayrollOverviewCedoliniBoardProps = {
  loading: boolean
  error: string | null
  metricGroups: PayrollMetric[][]
  filteredColumns: PayrollBoardColumnData[]
  columns: PayrollBoardColumnData[]
  selectedCardId: string | null
  selectedCard: PayrollBoardCardData | null
  onOpenCard: (recordId: string) => void
  onCloseCard: () => void
  draggingRecordId: string | null
  setDraggingRecordId: React.Dispatch<React.SetStateAction<string | null>>
  dropTargetColumnId: string | null
  setDropTargetColumnId: React.Dispatch<React.SetStateAction<string | null>>
  onMoveCard: (recordId: string, targetStageId: string) => void
  onPatchCard: (recordId: string, patch: Partial<MeseLavoratoRecord>) => void
  onPatchPresence: (recordId: string, patch: Partial<PresenzaMensileRecord>) => void
}

export function PayrollOverviewCedoliniBoard({
  loading,
  error,
  metricGroups,
  filteredColumns,
  columns,
  selectedCardId,
  selectedCard,
  onOpenCard,
  onCloseCard,
  draggingRecordId,
  setDraggingRecordId,
  dropTargetColumnId,
  setDropTargetColumnId,
  onMoveCard,
  onPatchCard,
  onPatchPresence,
}: PayrollOverviewCedoliniBoardProps) {
  return (
    <>
      <div className="px-4 pt-4">
        <div className="flex w-full items-stretch gap-3">
          {metricGroups.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              <div
                className={
                  "grid flex-1 items-stretch gap-3" +
                  (group.length === 2 ? " grid-cols-2" : group.length === 3 ? " grid-cols-3" : "")
                }
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
                  onOpenCard={onOpenCard}
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
                    onMoveCard(recordId, columnId)
                  }}
                />
              ))}
        </div>
      </div>

      <CedolinoDetailSheet
        key={selectedCardId ?? "__empty__"}
        card={selectedCard}
        columns={columns}
        open={Boolean(selectedCardId)}
        onOpenChange={(open) => {
          if (!open) onCloseCard()
        }}
        onStageChange={onMoveCard}
        onPatchCard={onPatchCard}
        onPatchPresence={onPatchPresence}
      />
    </>
  )
}
