import * as React from "react"

import type { WorkerOtherSelectionSummaryItem } from "@/modules/lavoratori/components/lavoratore-card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import {
  getLookupDropZoneActiveClassName,
  getLookupDropZoneClassName,
  getLookupToneTextClassName,
} from "@/lib/lookup-color-styles"
import { cn } from "@/lib/utils"
import {
  DEFAULT_BLUE_BADGE_CLASS_NAME,
  GROUPED_COLUMN_GROUPS,
  buildVisibleGroupedColumnSections,
  getWorkerColumnVisual,
  resolveGroupColor,
  resolveGroupDropStatusId,
} from "../lib/worker-pipeline-view-utils"
import type { RicercaWorkerSelectionCard, RicercaWorkerSelectionColumn } from "../types"
import { PipelineWorkerCard } from "./pipeline-worker-card"

export type WorkerPipelineColumnProps = {
  column: RicercaWorkerSelectionColumn
  isDropTarget: boolean
  activeGroupDropId: string | null
  draggingSelectionId: string | null
  draggingFromColumnId: string | null
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, selectionId: string | null) => void
  onDragStartCard: (selectionId: string, sourceColumnId: string) => void
  onDragEndCard: () => void
  onOpenWorker: (card: RicercaWorkerSelectionCard) => void
  onLoadOtherActiveSelectionDetails: (
    workerId: string
  ) => Promise<WorkerOtherSelectionSummaryItem[]>
}

export const WorkerPipelineColumn = React.memo(function WorkerPipelineColumn({
  column,
  isDropTarget,
  activeGroupDropId,
  draggingSelectionId,
  draggingFromColumnId,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
  onDragStartCard,
  onDragEndCard,
  onOpenWorker,
  onLoadOtherActiveSelectionDetails,
}: WorkerPipelineColumnProps) {
  const groups = GROUPED_COLUMN_GROUPS[column.id] ?? null
  const isGroupedColumn = Boolean(groups)
  const showDropZones =
    isGroupedColumn &&
    Boolean(draggingSelectionId) &&
    (draggingFromColumnId !== column.id || isDropTarget)
  const visual = getWorkerColumnVisual(column.id, column.label, column.color)
  const countLabel = `${column.cards.length} ${
    column.cards.length === 1 ? "lavoratore" : "lavoratori"
  }`
  const visibleGroups = React.useMemo(
    () => buildVisibleGroupedColumnSections(column),
    [column],
  )

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface flex h-full w-73 shrink-0 flex-col rounded-xl border transition-all duration-150",
        isDropTarget && "ring-primary/50 ring-2 shadow-md",
      )}
      onDragEnter={() => onDragEnterColumn(column.id)}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        onDragOverColumn(column.id)
      }}
      onDragLeave={onDragLeaveColumn}
      onDrop={(event) => {
        event.preventDefault()
        const droppedSelectionId =
          event.dataTransfer.getData("text/plain") || null
        onDropToColumn(column.dropStatusId ?? column.id, droppedSelectionId)
      }}
    >
      {visual.columnClassName ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0 left-0 right-0 h-1",
            visual.columnClassName,
          )}
        />
      ) : null}

      {groups ? (
        <div
          className={cn(
            "absolute inset-0 z-20 flex flex-col gap-1.5 rounded-xl p-2 transition-opacity",
            showDropZones
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          {groups.map((group) => {
            const groupDropId = `${column.id}::${group.key}`
            const isGroupDropTarget = activeGroupDropId === groupDropId
            const groupColor = resolveGroupColor(column, group)
            const groupStatusId = resolveGroupDropStatusId(column, group)

            return (
              <div
                key={group.key}
                onDragEnter={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onDragEnterColumn(groupDropId)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  event.dataTransfer.dropEffect = "move"
                  onDragOverColumn(groupDropId)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  const droppedSelectionId =
                    event.dataTransfer.getData("text/plain") || null
                  onDropToColumn(groupStatusId, droppedSelectionId)
                }}
                className={cn(
                  "flex min-h-0 flex-1 items-center justify-center rounded-md border-2 border-dashed transition-transform duration-150",
                  getLookupDropZoneClassName(groupColor),
                  isGroupDropTarget &&
                    cn(
                      getLookupDropZoneActiveClassName(groupColor),
                      "scale-[1.03]",
                    ),
                )}
              >
                <Badge className={DEFAULT_BLUE_BADGE_CLASS_NAME}>
                  {group.label}
                </Badge>
              </div>
            )
          })}
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3.5",
          visual.headerClassName,
        )}
      >
        <span
          aria-hidden
          className={cn(
            "shrink-0 size-2 rounded-full bg-current",
            visual.iconClassName,
          )}
        />
        <h2 className="text-foreground min-w-0 flex-1 truncate text-[15px] leading-5 font-semibold">
          {column.label}
        </h2>
        <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-2xs font-medium">
          {countLabel}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {column.cards.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed border-border/60 p-3 text-xs">
            Nessun lavoratore
          </div>
        ) : groups ? (
          <Accordion
            type="multiple"
            defaultValue={visibleGroups.map(({ group }) => group.key)}
            className="-mx-3 gap-1.5"
          >
            {visibleGroups.map(({ group, groupCards, groupColor }) => {
              return (
                <AccordionItem
                  key={group.key}
                  value={group.key}
                  className="not-last:border-0 rounded-none bg-transparent shadow-none data-[state=open]:shadow-none"
                >
                  <AccordionTrigger
                    className={cn(
                      "px-1.5 py-1.5 text-sm font-semibold no-underline hover:bg-transparent hover:no-underline",
                      getLookupToneTextClassName(groupColor),
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={DEFAULT_BLUE_BADGE_CLASS_NAME}
                      >
                        {group.label}
                      </Badge>
                      <span className="text-muted-foreground font-normal">
                        ({groupCards.length})
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 border-t-0 px-1.5 pt-1">
                    {groupCards.map((card) => (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", card.id)
                          event.dataTransfer.effectAllowed = "move"
                          onDragStartCard(card.id, column.id)
                        }}
                        onDragEnd={onDragEndCard}
                        className={cn(
                          "cursor-grab transition-opacity active:cursor-grabbing",
                          draggingSelectionId === card.id && "opacity-40",
                        )}
                      >
                        <PipelineWorkerCard
                          card={card}
                          onOpenWorker={onOpenWorker}
                          onLoadOtherActiveSelectionDetails={
                            onLoadOtherActiveSelectionDetails
                          }
                        />
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        ) : (
          column.cards.map((card) => (
            <div
              key={card.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", card.id)
                event.dataTransfer.effectAllowed = "move"
                onDragStartCard(card.id, column.id)
              }}
              onDragEnd={onDragEndCard}
              className={cn(
                "cursor-grab transition-opacity active:cursor-grabbing",
                draggingSelectionId === card.id && "opacity-40",
              )}
            >
              <PipelineWorkerCard
                card={card}
                onOpenWorker={onOpenWorker}
                onLoadOtherActiveSelectionDetails={
                  onLoadOtherActiveSelectionDetails
                }
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
})
