import * as React from "react"

import { KanbanColumnShell } from "@/components/shared-next/kanban"
import { getKanbanColumnVisual } from "@/lib/kanban-column-utils"
import { cn } from "@/lib/utils"

import { contributiInpsStageTestId } from "../lib"
import type { ContributiColumnData } from "../types"
import { ContributiInpsCard } from "./contributi-inps-card"

export type ContributiInpsBoardColumnProps = {
  column: ContributiColumnData
  draggingRecordId: string | null
  isDropTarget: boolean
  onOpenCard: (recordId: string) => void
  onDragStartCard: (recordId: string) => void
  onDragEndCard: () => void
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, recordId: string | null) => void
}

export function ContributiInpsBoardColumn({
  column,
  draggingRecordId,
  isDropTarget,
  onOpenCard,
  onDragStartCard,
  onDragEndCard,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
}: ContributiInpsBoardColumnProps) {
  const visual = getKanbanColumnVisual(column.color)

  return (
    <KanbanColumnShell
      columnId={column.id}
      testId={contributiInpsStageTestId(column.id)}
      title={column.label}
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "contributo" : "contributi"}`}
      visual={visual}
      density="compact"
      widthClassName="w-73"
      isDropTarget={isDropTarget}
      emptyState={
        <div className="text-muted-foreground rounded-lg border border-dashed border-border/60 p-3 text-xs">
          Nessun contributo
        </div>
      }
      onDragEnter={onDragEnterColumn}
      onDragOver={onDragOverColumn}
      onDragLeave={onDragLeaveColumn}
      onDrop={onDropToColumn}
    >
      {column.cards.map((card) => (
        <div
          key={card.id}
          data-testid={`contributi-inps-card-${card.id}`}
          draggable
          onClick={() => onOpenCard(card.id)}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id)
            event.dataTransfer.effectAllowed = "move"
            onDragStartCard(card.id)
          }}
          onDragEnd={onDragEndCard}
          className={cn(
            "cursor-grab transition-opacity active:cursor-grabbing",
            draggingRecordId === card.id && "opacity-40",
          )}
        >
          <ContributiInpsCard card={card} />
        </div>
      ))}
    </KanbanColumnShell>
  )
}
