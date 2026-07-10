import type { DragEvent } from "react"

import { KanbanColumnShell } from "@/components/shared-next/kanban"
import { Button } from "@/components/ui/button"
import { getKanbanColumnVisual } from "@/lib/kanban-column-utils"
import { assunzioniStageTestId } from "../lib/assunzioni-board-constants"
import type { AssunzioniBoardCardData, AssunzioniBoardColumnData, AssunzioniBoardDragHandlers } from "../types"
import { AssunzioniBoardCard } from "./assunzioni-board-card"

export function AssunzioniBoardColumn({
  column,
  drag,
  onCardClick,
  onLoadDeferredColumn,
}: {
  column: AssunzioniBoardColumnData
  drag: AssunzioniBoardDragHandlers
  onCardClick: (card: AssunzioniBoardCardData) => void
  onLoadDeferredColumn: (columnId: string) => void
}) {
  const visual = getKanbanColumnVisual(column.color)

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return
    drag.onDragLeaveColumn(column.id, event)
  }

  return (
    <KanbanColumnShell
      columnId={column.id}
      testId={assunzioniStageTestId(column.id)}
      title={column.label}
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "processo" : "processi"}`}
      visual={visual}
      isDropTarget={drag.dropTargetColumnId === column.id}
      emptyMessage="Nessun processo"
      onDragEnter={drag.onDragEnterColumn}
      onDragOver={drag.onDragOverColumn}
      onDragLeave={handleDragLeave}
      onDrop={drag.onDropToColumn}
    >
      {column.deferred && !column.loaded ? (
        <div className="rounded-lg border border-dashed bg-surface p-3 text-sm">
          <Button
            className="w-full"
            disabled={column.loading}
            size="sm"
            variant="outline"
            onClick={() => onLoadDeferredColumn(column.id)}
          >
            {column.loading ? "Caricamento..." : "Carica processi"}
          </Button>
          {column.loadError ? (
            <p className="mt-2 text-xs text-red-600">{column.loadError}</p>
          ) : null}
        </div>
      ) : null}
      {column.cards.map((card) => (
        <AssunzioniBoardCard
          key={card.id}
          card={card}
          dragging={drag.draggingProcessId === card.id}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id)
            event.dataTransfer.effectAllowed = "move"
            drag.onDragStartCard(card.id)
          }}
          onDragEnd={drag.onDragEndCard}
          onClick={() => onCardClick(card)}
        />
      ))}
    </KanbanColumnShell>
  )
}
