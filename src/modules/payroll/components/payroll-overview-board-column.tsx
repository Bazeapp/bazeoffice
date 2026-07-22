import { KanbanColumnShell } from "@/components/shared-next/kanban"
import { getKanbanColumnVisual } from "@/lib/kanban-column-utils"
import { cn } from "@/lib/utils"

import { cedoliniStageTestId } from "../lib"
import type { PayrollBoardColumnProps } from "../types"
import { PayrollOverviewBoardCard } from "./payroll-overview-board-card"

export function PayrollOverviewBoardColumn({
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
}: PayrollBoardColumnProps) {
  const visual = getKanbanColumnVisual(column.color)

  return (
    <KanbanColumnShell
      columnId={column.id}
      testId={cedoliniStageTestId(column.id)}
      title={column.label}
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "cedolino" : "cedolini"}`}
      visual={visual}
      density="compact"
      widthClassName="w-70"
      isDropTarget={isDropTarget}
      emptyState={
        <div className="text-muted-foreground rounded-lg border border-dashed border-border/60 p-3 text-xs">
          Nessun cedolino
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
          data-testid={`cedolini-card-${card.id}`}
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
          <PayrollOverviewBoardCard card={card} />
        </div>
      ))}
    </KanbanColumnShell>
  )
}
